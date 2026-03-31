const ObservationCard = require('../models/ObservationCard.model');
const EvaluationAttempt = require('../models/EvaluationAttempt.model');
const FinalEvaluation = require('../models/FinalEvaluation.model');
const StudentLevel = require('../models/StudentLevel.model');
const Badge = require('../models/Badge.model');
const Submission = require('../models/Submission.model');
const Progress = require('../models/Progress.model');
const Project = require('../models/Project.model');
const Team = require('../models/Team.model');
const TeamProject = require('../models/TeamProject.model');
const TeamSubmission = require('../models/TeamSubmission.model');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const AI_EVAL_MODELS = (process.env.AI_MODELS || 'gemini-2.0-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

const extractWokwiLink = (text) => {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/https:\/\/wokwi\.com\/projects\/[a-zA-Z0-9_-]+/);
  return match ? match[0] : null;
};

const safeJsonParse = (rawText) => {
  if (!rawText) return null;
  const text = String(rawText).trim();

  try {
    return JSON.parse(text);
  } catch (_) {}

  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (_) {}
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch (_) {}
  }

  return null;
};

const buildRecommendedMap = (recommendations = []) => {
  const map = {};
  for (const section of recommendations) {
    if (!section?.sectionName) continue;
    const key = String(section.sectionName).trim();
    map[key] = {};
    for (const criterion of section.criteria || []) {
      if (!criterion?.criterionName) continue;
      map[key][String(criterion.criterionName).trim()] = Number(criterion.selectedPercentage || 0);
    }
  }
  return map;
};

const nearestAllowedPercentage = (value, allowed = []) => {
  if (!allowed.length) return 0;
  let nearest = allowed[0];
  let minDiff = Math.abs(value - nearest);
  for (const option of allowed) {
    const diff = Math.abs(value - option);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = option;
    }
  }
  return nearest;
};

const buildSectionEvaluationsFromCard = ({
  card,
  recommendations,
  project,
  studentRole,
  enforceAllCriteria = false
}) => {
  const recMap = buildRecommendedMap(recommendations);
  let totalScore = 0;
  const sectionEvaluations = [];

  for (const section of card.sections || []) {
    const sectionRec = recMap[section.name] || {};
    let sumPercentages = 0;
    let requiredCount = 0;

    const criterionSelections = (section.criteria || []).map((criterion) => {
      const isRequired = enforceAllCriteria
        ? true
        : (
          !project.isTeamProject
          || (criterion.applicableRoles || []).includes('all')
          || (criterion.applicableRoles || []).includes(studentRole)
        );

      const rawValue = Number(sectionRec[criterion.name] ?? 0);
      const allowedOptions = (criterion.options || []).map((o) => Number(o.percentage));
      const selectedPercentage = nearestAllowedPercentage(rawValue, allowedOptions);
      const selectedOption = (criterion.options || []).find((o) => Number(o.percentage) === selectedPercentage);

      if (isRequired) {
        sumPercentages += selectedPercentage;
        requiredCount += 1;
      }

      return {
        criterionName: criterion.name,
        isRequired,
        selectedPercentage,
        selectedDescription: selectedOption?.description || ''
      };
    });

    const avgPercentage = requiredCount > 0 ? (sumPercentages / requiredCount) : 0;
    const calculatedSectionScore = avgPercentage * ((section.weight || 0) / 100);
    totalScore += calculatedSectionScore;

    sectionEvaluations.push({
      sectionName: section.name,
      sectionWeight: section.weight,
      criterionSelections,
      calculatedSectionScore
    });
  }

  return {
    sectionEvaluations,
    calculatedScore: Number(totalScore.toFixed(2))
  };
};

const buildCardPromptShape = (card) => {
  return (card.sections || []).map((section) => ({
    sectionName: section.name,
    weight: section.weight,
    criteria: (section.criteria || []).map((criterion) => ({
      criterionName: criterion.name,
      applicableRoles: criterion.applicableRoles || ['all'],
      allowedPercentages: (criterion.options || []).map((o) => o.percentage),
      options: (criterion.options || []).map((o) => ({
        percentage: o.percentage,
        description: o.description
      }))
    }))
  }));
};

const callGeminiForAssessment = async (prompt) => {
  if (!geminiClient) {
    throw new Error('GEMINI_API_KEY غير مضبوط في إعدادات السيرفر');
  }

  let lastError = null;
  for (const modelName of AI_EVAL_MODELS) {
    try {
      const model = geminiClient.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result?.response?.text?.() || '';
      if (text) return text;
      lastError = new Error(`No response text from ${modelName}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('فشل استدعاء نموذج الذكاء الاصطناعي');
};

// ============================================================================
// OBSERVATION CARD MANAGEMENT
// ============================================================================

// @desc    Create or update observation card for a specific phase
// @route   POST /api/assessment/observation-card
// @access  Private (Teacher/Admin)
exports.createOrUpdateObservationCard = async (req, res) => {
  try {
    const { projectId, phase, sections } = req.body;

    // Validate phase
    if (!['group', 'individual_oral'].includes(phase)) {
      return res.status(400).json({
        success: false,
        message: 'Phase must be either "group" or "individual_oral"'
      });
    }

    // Verify project exists and user has permission
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    if (project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل بطاقة الملاحظة'
      });
    }

    // Find or create observation card
    let observationCard = await ObservationCard.findOne({ 
      project: projectId,
      phase 
    });

    if (observationCard) {
      observationCard.sections = sections;
      await observationCard.save();
    } else {
      observationCard = await ObservationCard.create({
        project: projectId,
        phase,
        sections,
        createdBy: req.user.id
      });
    }

    res.json({
      success: true,
      message: 'تم حفظ بطاقة الملاحظة بنجاح',
      data: observationCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ بطاقة الملاحظة',
      error: error.message
    });
  }
};

// @desc    Update observation card sections by card id
// @route   PUT /api/assessment/observation-card/:cardId
// @access  Private (Teacher/Admin)
exports.updateObservationCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { sections } = req.body;

    const observationCard = await ObservationCard.findById(cardId).populate('project', 'instructor');
    if (!observationCard) {
      return res.status(404).json({
        success: false,
        message: 'بطاقة الملاحظة غير موجودة'
      });
    }

    const projectInstructorId = observationCard.project?.instructor?.toString();
    if (projectInstructorId && projectInstructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل بطاقة الملاحظة'
      });
    }

    observationCard.sections = sections;
    await observationCard.save();

    res.json({
      success: true,
      message: 'تم تحديث بطاقة الملاحظة بنجاح',
      data: observationCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث بطاقة الملاحظة',
      error: error.message
    });
  }
};

// @desc    Get observation card by phase
// @route   GET /api/assessment/observation-card/:projectId/:phase
// @access  Private
exports.getObservationCardByPhase = async (req, res) => {
  try {
    const { projectId, phase } = req.params;

    const observationCard = await ObservationCard.findOne({ 
      project: projectId,
      phase 
    }).populate('project', 'title isTeamProject');

    if (!observationCard) {
      return res.status(404).json({
        success: false,
        message: 'بطاقة الملاحظة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: observationCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بطاقة الملاحظة',
      error: error.message
    });
  }
};

// ============================================================================
// PHASE 1: GROUP ASSESSMENT
// ============================================================================

// @desc    Evaluate group (Phase 1)
// @route   POST /api/assessment/evaluate-group
// @access  Private (Teacher/Admin)
exports.evaluateGroup = async (req, res) => {
  try {
    const { 
      projectId, 
      teamId, 
      studentId,
      submissionId, 
      sectionEvaluations, 
      feedbackSummary,
      evaluationSource = 'manual',
      aiApproval = null
    } = req.body;

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    if (project.isTeamProject && !teamId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الفريق مطلوب للتقييم الجماعي'
      });
    }

    if (!project.isTeamProject && !studentId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الطالب مطلوب للتقييم الجماعي في المشروع الفردي'
      });
    }

    // Verify permission
    if (project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتقييم هذا المشروع'
      });
    }

    // Get observation card
    const observationCard = await ObservationCard.findOne({ 
      project: projectId,
      phase: 'group'
    });

    if (!observationCard) {
      return res.status(404).json({
        success: false,
        message: 'بطاقة ملاحظة المرحلة الجماعية غير موجودة'
      });
    }

    // Calculate group score
    let totalScore = 0;
    const processedSections = [];

    for (const sectionEval of sectionEvaluations) {
      const sectionTemplate = observationCard.sections.find(
        s => s.name === sectionEval.sectionName
      );
      
      if (!sectionTemplate) continue;

      // Calculate average percentage for this section
      const criteriaCount = sectionEval.criterionSelections.length;
      const sumPercentages = sectionEval.criterionSelections.reduce(
        (sum, crit) => sum + crit.selectedPercentage, 0
      );
      const avgPercentage = sumPercentages / criteriaCount;

      // Apply section weight
      const sectionScore = avgPercentage * (sectionTemplate.weight / 100);
      totalScore += sectionScore;

      processedSections.push({
        sectionName: sectionEval.sectionName,
        sectionWeight: sectionTemplate.weight,
        criterionSelections: sectionEval.criterionSelections.map(c => ({
          criterionName: c.criterionName,
          isRequired: true,
          selectedPercentage: c.selectedPercentage,
          selectedDescription: c.selectedDescription
        })),
        calculatedSectionScore: sectionScore
      });
    }

    const calculatedScore = totalScore;

    const attemptQuery = {
      project: projectId,
      phase: 'group',
      ...(project.isTeamProject ? { team: teamId } : { student: studentId })
    };

    // Get previous attempts count
    const previousAttempts = await EvaluationAttempt.find(attemptQuery).sort({ attemptNumber: -1 });

    const attemptNumber = previousAttempts.length > 0 
      ? previousAttempts[0].attemptNumber + 1 
      : 1;

    // Mark old attempts as not latest
    await EvaluationAttempt.updateMany(
      { 
        project: projectId,
        phase: 'group',
        ...(project.isTeamProject ? { team: teamId } : { student: studentId }),
        isLatestAttempt: true
      },
      { isLatestAttempt: false }
    );

    // Create group evaluation
    const groupEvaluation = await EvaluationAttempt.create({
      project: projectId,
      phase: 'group',
      team: project.isTeamProject ? teamId : undefined,
      student: project.isTeamProject ? undefined : studentId,
      submission: submissionId,
      observationCard: observationCard._id,
      evaluator: req.user.id,
      attemptNumber,
      sectionEvaluations: processedSections,
      calculatedScore,
      feedbackSummary,
      evaluationSource,
      aiApproval: aiApproval ? {
        evaluationApprovedBy: req.user.id,
        evaluationApprovedAt: new Date(),
        confidence: Number(aiApproval.confidence || 0),
        plagiarismSimilarityPercent: Number(aiApproval.plagiarismSimilarityPercent || 0),
        plagiarismLevel: aiApproval.plagiarismLevel || null,
        rationale: aiApproval.rationale || ''
      } : undefined,
      retryAllowed: false,
      isLatestAttempt: true
    });

    res.json({
      success: true,
      message: 'تم حفظ التقييم الجماعي بنجاح',
      data: groupEvaluation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ التقييم الجماعي',
      error: error.message
    });
  }
};

// @desc    Get group evaluation status
// @route   GET /api/assessment/group-status/:projectId/:teamId
// @access  Private
exports.getGroupStatus = async (req, res) => {
  try {
    const { projectId, teamId } = req.params;

    const latestGroupEval = await EvaluationAttempt.findOne({
      project: projectId,
      team: teamId,
      phase: 'group',
      isLatestAttempt: true
    });

    if (!latestGroupEval) {
      return res.json({
        success: true,
        data: {
          phase1Complete: false,
          latestScore: null,
          attemptNumber: 0
        }
      });
    }

    res.json({
      success: true,
      data: {
        phase1Complete: true,
        latestScore: latestGroupEval.calculatedScore,
        attemptNumber: latestGroupEval.attemptNumber,
        feedbackSummary: latestGroupEval.feedbackSummary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة التقييم الجماعي',
      error: error.message
    });
  }
};

// ============================================================================
// PHASE 2: INDIVIDUAL + ORAL ASSESSMENT
// ============================================================================

// @desc    Evaluate individual student (Phase 2)
// @route   POST /api/assessment/evaluate-individual
// @access  Private (Teacher/Admin)
exports.evaluateIndividual = async (req, res) => {
  try {
    const { 
      projectId, 
      studentId,
      studentRole,
      submissionId, 
      sectionEvaluations, 
      feedbackSummary,
      evaluationSource = 'manual',
      aiApproval = null
    } = req.body;

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    // Verify permission
    if (project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتقييم هذا المشروع'
      });
    }

    // IF team project, verify Phase 1 is complete
    if (project.isTeamProject) {
      // Find student's team
      const team = await Team.findOne({
        project: projectId,
        'members.user': studentId
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'الطالب غير مسجل في أي فريق لهذا المشروع'
        });
      }

      // Check if group evaluation exists
      const groupEval = await EvaluationAttempt.findOne({
        project: projectId,
        team: team._id,
        phase: 'group',
        isLatestAttempt: true
      });

      if (!groupEval) {
        return res.status(400).json({
          success: false,
          message: 'يجب إكمال التقييم الجماعي (المرحلة الأولى) أولاً'
        });
      }
    }

    // Get observation card
    const observationCard = await ObservationCard.findOne({ 
      project: projectId,
      phase: 'individual_oral'
    });

    if (!observationCard) {
      return res.status(404).json({
        success: false,
        message: 'بطاقة ملاحظة المرحلة الفردية غير موجودة'
      });
    }

    // Calculate individual score (with role filtering)
    let totalScore = 0;
    const processedSections = [];

    for (const sectionEval of sectionEvaluations) {
      const sectionTemplate = observationCard.sections.find(
        s => s.name === sectionEval.sectionName
      );
      
      if (!sectionTemplate) continue;

      // Filter and calculate based on role
      let sumPercentages = 0;
      let requiredCount = 0;

      const processedCriteria = sectionEval.criterionSelections.map(critSel => {
        const criterionTemplate = sectionTemplate.criteria.find(
          c => c.name === critSel.criterionName
        );

        const isRequired = criterionTemplate && (
          !project.isTeamProject ||
          criterionTemplate.applicableRoles.includes('all') ||
          criterionTemplate.applicableRoles.includes(studentRole)
        );

        if (isRequired) {
          sumPercentages += critSel.selectedPercentage;
          requiredCount++;
        }

        return {
          criterionName: critSel.criterionName,
          isRequired,
          selectedPercentage: critSel.selectedPercentage || 0,
          selectedDescription: critSel.selectedDescription || ''
        };
      });

      // Calculate section score only from required criteria
      const avgPercentage = requiredCount > 0 ? sumPercentages / requiredCount : 0;
      const sectionScore = avgPercentage * (sectionTemplate.weight / 100);
      totalScore += sectionScore;

      processedSections.push({
        sectionName: sectionEval.sectionName,
        sectionWeight: sectionTemplate.weight,
        criterionSelections: processedCriteria,
        calculatedSectionScore: sectionScore
      });
    }

    const calculatedScore = totalScore;

    // Get previous attempts count
    const previousAttempts = await EvaluationAttempt.find({
      project: projectId,
      student: studentId,
      phase: 'individual_oral'
    }).sort({ attemptNumber: -1 });

    const attemptNumber = previousAttempts.length > 0 
      ? previousAttempts[0].attemptNumber + 1 
      : 1;

    // Mark old attempts as not latest
    await EvaluationAttempt.updateMany(
      { 
        project: projectId,
        student: studentId,
        phase: 'individual_oral',
        isLatestAttempt: true
      },
      { isLatestAttempt: false }
    );

    // Create individual evaluation
    const individualEvaluation = await EvaluationAttempt.create({
      project: projectId,
      phase: 'individual_oral',
      student: studentId,
      studentRole,
      submission: submissionId,
      observationCard: observationCard._id,
      evaluator: req.user.id,
      attemptNumber,
      sectionEvaluations: processedSections,
      calculatedScore,
      feedbackSummary,
      evaluationSource,
      aiApproval: aiApproval ? {
        evaluationApprovedBy: req.user.id,
        evaluationApprovedAt: new Date(),
        confidence: Number(aiApproval.confidence || 0),
        plagiarismSimilarityPercent: Number(aiApproval.plagiarismSimilarityPercent || 0),
        plagiarismLevel: aiApproval.plagiarismLevel || null,
        rationale: aiApproval.rationale || ''
      } : undefined,
      retryAllowed: false,
      isLatestAttempt: true
    });

    res.json({
      success: true,
      message: 'تم حفظ التقييم الفردي بنجاح',
      data: individualEvaluation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ التقييم الفردي',
      error: error.message
    });
  }
};

// @desc    Get individual evaluation status
// @route   GET /api/assessment/individual-status/:projectId/:studentId
// @access  Private
exports.getIndividualStatus = async (req, res) => {
  try {
    const { projectId, studentId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    const latestIndividualEval = await EvaluationAttempt.findOne({
      project: projectId,
      student: studentId,
      phase: 'individual_oral',
      isLatestAttempt: true
    });

    if (project.isTeamProject && !latestIndividualEval) {
      return res.json({
        success: true,
        data: {
          phase2Complete: false,
          role: null,
          latestScore: null,
          attemptNumber: 0
        }
      });
    }

    if (!project.isTeamProject) {
      const latestGroupEval = await EvaluationAttempt.findOne({
        project: projectId,
        student: studentId,
        phase: 'group',
        isLatestAttempt: true
      });

      const hasBothCards = Boolean(latestGroupEval && latestIndividualEval);
      const combinedScore = hasBothCards
        ? Number((((latestGroupEval.calculatedScore + latestIndividualEval.calculatedScore) / 2)).toFixed(2))
        : null;

      return res.json({
        success: true,
        data: {
          phase2Complete: hasBothCards,
          role: latestIndividualEval?.studentRole || null,
          latestScore: combinedScore,
          attemptNumber: latestIndividualEval?.attemptNumber || 0,
          groupScore: latestGroupEval?.calculatedScore ?? null,
          individualScore: latestIndividualEval?.calculatedScore ?? null,
          feedbackSummary: latestIndividualEval?.feedbackSummary || ''
        }
      });
    }

    res.json({
      success: true,
      data: {
        phase2Complete: true,
        role: latestIndividualEval.studentRole,
        latestScore: latestIndividualEval.calculatedScore,
        attemptNumber: latestIndividualEval.attemptNumber,
        feedbackSummary: latestIndividualEval.feedbackSummary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة التقييم الفردي',
      error: error.message
    });
  }
};

// @desc    Generate AI evaluation draft for one student (individual project pilot)
// @route   POST /api/assessment/ai-evaluate-individual
// @access  Private (Teacher/Admin)
exports.generateAIEvaluationDraft = async (req, res) => {
  try {
    const { projectId, studentId, submissionId } = req.body;

    if (!projectId || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'projectId و studentId مطلوبان'
      });
    }

    const project = await Project.findById(projectId).select('title description instructor isTeamProject');
    if (!project) {
      return res.status(404).json({ success: false, message: 'المشروع غير موجود' });
    }

    if (req.user.role !== 'admin' && project.instructor?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتقييم هذا المشروع' });
    }

    if (project.isTeamProject) {
      return res.status(400).json({
        success: false,
        message: 'نسخة AI الحالية مفعلة فقط للمشروع الفردي. سنوسعها للمشروع الجماعي بعد التجربة.'
      });
    }

    const [groupCard, individualCard] = await Promise.all([
      ObservationCard.findOne({ project: projectId, phase: 'group' }),
      ObservationCard.findOne({ project: projectId, phase: 'individual_oral' })
    ]);

    if (!groupCard || !individualCard) {
      return res.status(404).json({
        success: false,
        message: 'بطاقات الملاحظة المطلوبة (الجماعية + الفردية) غير متاحة لهذا المشروع'
      });
    }

    let submissionRecord = null;
    let submissionSource = 'submission-model';

    if (submissionId) {
      submissionRecord = await Submission.findById(submissionId).populate('student', 'name email');
    }

    if (!submissionRecord || String(submissionRecord.student?._id || submissionRecord.student) !== String(studentId)) {
      submissionRecord = await Submission.findOne({
        'assignment.projectId': projectId,
        student: studentId
      })
        .sort({ submittedAt: -1 })
        .populate('student', 'name email');
    }

    if (!submissionRecord) {
      submissionSource = 'progress-model';
      if (submissionId) {
        submissionRecord = await Progress.findById(submissionId).populate('student', 'name email');
      }
      if (!submissionRecord || String(submissionRecord.student?._id || submissionRecord.student) !== String(studentId)) {
        submissionRecord = await Progress.findOne({
          project: projectId,
          student: studentId,
          $or: [
            { status: { $in: ['submitted', 'reviewed', 'completed'] } },
            { submittedAt: { $exists: true, $ne: null } },
            { submissionUrl: { $exists: true, $nin: [null, ''] } },
            { codeSubmission: { $exists: true, $nin: [null, ''] } },
            { 'submissionFiles.0': { $exists: true } }
          ]
        })
          .sort({ submittedAt: -1, updatedAt: -1 })
          .populate('student', 'name email');
      }
    }

    if (!submissionRecord) {
      return res.status(404).json({
        success: false,
        message: 'لا يوجد تسليم لهذا الطالب في هذا المشروع'
      });
    }

    const submissionView = submissionSource === 'submission-model'
      ? {
        id: submissionRecord._id,
        student: submissionRecord.student,
        fileTitle: submissionRecord.fileTitle || '',
        fileName: submissionRecord.fileName || '',
        fileType: submissionRecord.fileType || '',
        fileUrl: submissionRecord.fileUrl || '',
        comments: submissionRecord.comments || '',
        codeSubmission: '',
        notes: '',
        submittedAt: submissionRecord.submittedAt
      }
      : {
        id: submissionRecord._id,
        student: submissionRecord.student,
        fileTitle: 'Project Submission',
        fileName: submissionRecord.submissionFiles?.[submissionRecord.submissionFiles.length - 1]?.filename || 'No file',
        fileType: '',
        fileUrl: submissionRecord.submissionUrl || submissionRecord.submissionFiles?.[submissionRecord.submissionFiles.length - 1]?.url || '',
        comments: submissionRecord.notes || '',
        codeSubmission: submissionRecord.codeSubmission || '',
        notes: submissionRecord.notes || '',
        submittedAt: submissionRecord.submittedAt || submissionRecord.updatedAt
      };

    const wokwiLink = extractWokwiLink(submissionView.comments)
      || extractWokwiLink(submissionView.fileUrl)
      || extractWokwiLink(submissionView.codeSubmission)
      || null;

    const otherSubmissions = submissionSource === 'submission-model'
      ? await Submission.find({
        'assignment.projectId': projectId,
        student: { $ne: studentId }
      }).select('student comments fileUrl').populate('student', 'name')
      : await Progress.find({
        project: projectId,
        student: { $ne: studentId },
        $or: [
          { status: { $in: ['submitted', 'reviewed', 'completed'] } },
          { submittedAt: { $exists: true, $ne: null } },
          { submissionUrl: { $exists: true, $nin: [null, ''] } },
          { codeSubmission: { $exists: true, $nin: [null, ''] } },
          { 'submissionFiles.0': { $exists: true } }
        ]
      }).select('student notes submissionUrl codeSubmission').populate('student', 'name');

    const matchedStudents = [];
    if (wokwiLink) {
      for (const other of otherSubmissions) {
        const otherWokwi = submissionSource === 'submission-model'
          ? (extractWokwiLink(other.comments) || extractWokwiLink(other.fileUrl))
          : (extractWokwiLink(other.notes) || extractWokwiLink(other.submissionUrl) || extractWokwiLink(other.codeSubmission));
        if (otherWokwi && otherWokwi === wokwiLink) {
          matchedStudents.push({
            studentId: other.student?._id,
            studentName: other.student?.name || 'طالب آخر',
            matchedLink: otherWokwi
          });
        }
      }
    }

    const plagiarismSimilarityPercent = matchedStudents.length > 0 ? 90 : 10;
    const plagiarismLevel = matchedStudents.length > 0 ? 'high' : 'low';
    const plagiarismReason = matchedStudents.length > 0
      ? 'تم العثور على رابط Wokwi مطابق لتسليمات طلاب آخرين في نفس المشروع.'
      : 'لا يوجد تطابق مباشر واضح في رابط Wokwi مع تسليمات أخرى.';

    const promptPayload = {
      language: 'Arabic',
      task: 'Evaluate one student submission based on provided observation cards and return structured JSON only.',
      strictRules: [
        'Return JSON only without markdown fences.',
        'For every criterion in both cards, choose only one allowed percentage from allowedPercentages.',
        'Keep rationale concise and actionable for teacher review.',
        'Include feedbackSuggestion for the student in Arabic.'
      ],
      teacherGoal: 'Draft teacher-like observation-card evaluation to review and approve manually.',
      project: {
        id: project._id,
        title: project.title,
        description: project.description || ''
      },
      student: {
        id: submissionView.student?._id || submissionView.student,
        name: submissionView.student?.name || 'طالب',
        email: submissionView.student?.email || ''
      },
      submission: {
        id: submissionView.id,
        source: submissionSource,
        fileTitle: submissionView.fileTitle,
        fileName: submissionView.fileName,
        fileType: submissionView.fileType,
        fileUrl: submissionView.fileUrl,
        comments: submissionView.comments,
        codeSubmission: submissionView.codeSubmission,
        submittedAt: submissionView.submittedAt,
        wokwiLink: wokwiLink || ''
      },
      plagiarismSignal: {
        similarityPercent: plagiarismSimilarityPercent,
        level: plagiarismLevel,
        reason: plagiarismReason,
        matchedStudents
      },
      observationCards: {
        group: buildCardPromptShape(groupCard),
        individual_oral: buildCardPromptShape(individualCard)
      },
      requiredOutputShape: {
        groupRecommendations: [
          {
            sectionName: 'string',
            criteria: [{ criterionName: 'string', selectedPercentage: 0 }]
          }
        ],
        individualRecommendations: [
          {
            sectionName: 'string',
            criteria: [{ criterionName: 'string', selectedPercentage: 0 }]
          }
        ],
        rationale: 'string',
        feedbackSuggestion: 'string',
        confidence: 0
      }
    };

    const rawResponse = await callGeminiForAssessment(JSON.stringify(promptPayload));
    const parsed = safeJsonParse(rawResponse);

    if (!parsed) {
      return res.status(502).json({
        success: false,
        message: 'تعذر قراءة مخرجات AI بصيغة JSON صالحة. حاول مرة أخرى.'
      });
    }

    const groupDraft = buildSectionEvaluationsFromCard({
      card: groupCard,
      recommendations: parsed.groupRecommendations || [],
      project,
      studentRole: 'programmer',
      enforceAllCriteria: true
    });

    const individualDraft = buildSectionEvaluationsFromCard({
      card: individualCard,
      recommendations: parsed.individualRecommendations || [],
      project,
      studentRole: 'programmer',
      enforceAllCriteria: true
    });

    const overallScore = Number((((groupDraft.calculatedScore + individualDraft.calculatedScore) / 2)).toFixed(2));

    return res.json({
      success: true,
      data: {
        basedOnSubmissionId: submissionView.id,
        basedOnSubmissionSource: submissionSource,
        studentRole: 'programmer',
        groupCard: groupDraft,
        individualCard: individualDraft,
        overallScore,
        rationale: parsed.rationale || 'لم يتم توفير مبرر مفصل من AI.',
        feedbackSuggestion: parsed.feedbackSuggestion || '',
        confidence: Number(parsed.confidence || 0),
        plagiarism: {
          similarityPercent: plagiarismSimilarityPercent,
          level: plagiarismLevel,
          reason: plagiarismReason,
          matchedStudents
        },
        generatedAt: new Date()
      }
    });
  } catch (error) {
    const rawMessage = String(error?.message || '');
    const lowered = rawMessage.toLowerCase();
    const isQuotaOrRateLimited =
      lowered.includes('429')
      || lowered.includes('quota')
      || lowered.includes('rate limit')
      || lowered.includes('too many requests');

    if (isQuotaOrRateLimited) {
      const retryMatch = rawMessage.match(/retry in\s+([\d.]+)s/i);
      const retryAfterSeconds = retryMatch ? Math.ceil(Number(retryMatch[1])) : null;

      if (retryAfterSeconds && Number.isFinite(retryAfterSeconds)) {
        res.set('Retry-After', String(retryAfterSeconds));
      }

      return res.status(429).json({
        success: false,
        message: 'خدمة تقييم AI وصلت للحد الأقصى مؤقتاً. حاول مرة أخرى بعد قليل.',
        retryAfterSeconds,
        error: rawMessage
      });
    }

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء توليد تقييم AI',
      error: error.message
    });
  }
};

// ============================================================================
// FINAL EVALUATION
// ============================================================================

// @desc    Finalize evaluation (combine Phase 1 + Phase 2)
// @route   POST /api/assessment/finalize
// @access  Private (Teacher/Admin)
exports.finalizeEvaluation = async (req, res) => {
  try {
    const { projectId, studentId } = req.body;

    // ========================================================================
    // STEP 1: VALIDATE PROJECT & FETCH DATA
    // ========================================================================
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    // Get individual evaluation (required for all projects)
    const individualEval = await EvaluationAttempt.findOne({
      project: projectId,
      student: studentId,
      phase: 'individual_oral',
      isLatestAttempt: true
    });

    if (!individualEval) {
      return res.status(400).json({
        success: false,
        message: 'لا يوجد تقييم فردي للطالب'
      });
    }

    let groupScore = 0;
    let groupEvaluation = null;
    let teamId = null;

    // ========================================================================
    // STEP 2: GET GROUP EVALUATION (IF TEAM PROJECT)
    // ========================================================================
    if (project.isTeamProject) {
      // Find student's team
      const team = await Team.findOne({
        project: projectId,
        'members.user': studentId
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'الطالب غير مسجل في أي فريق'
        });
      }

      teamId = team._id;

      groupEvaluation = await EvaluationAttempt.findOne({
        project: projectId,
        team: teamId,
        phase: 'group',
        isLatestAttempt: true
      });

      if (!groupEvaluation) {
        return res.status(400).json({
          success: false,
          message: 'لا يوجد تقييم جماعي للفريق'
        });
      }

      groupScore = groupEvaluation.calculatedScore;
    } else {
      // For individual projects, group-phase card is evaluated per student
      groupEvaluation = await EvaluationAttempt.findOne({
        project: projectId,
        student: studentId,
        phase: 'group',
        isLatestAttempt: true
      });

      if (!groupEvaluation) {
        return res.status(400).json({
          success: false,
          message: 'لا يوجد تقييم بطاقة الملاحظة الأولى (الجماعية) للطالب'
        });
      }

      groupScore = groupEvaluation.calculatedScore;
    }

    const individualScore = individualEval.calculatedScore;

    // ========================================================================
    // STEP 3: CALCULATE FINAL SCORES
    // ========================================================================
    // For team projects: finalScore = group + individual (0-200)
    // For individual projects: finalScore = average(group, individual) (0-100)
    const maxScore = project.isTeamProject ? 200 : 100;
    const finalScore = project.isTeamProject
      ? (groupScore + individualScore)
      : Number((((groupScore + individualScore) / 2)).toFixed(2));
    const finalPercentage = (finalScore / maxScore) * 100;

    // Determine verbal grade
    let verbalGrade;
    if (finalPercentage >= 85) verbalGrade = 'ممتاز';
    else if (finalPercentage >= 75) verbalGrade = 'جيد جدًا';
    else if (finalPercentage >= 65) verbalGrade = 'جيد';
    else if (finalPercentage >= 60) verbalGrade = 'مقبول';
    else verbalGrade = 'غير مجتاز';

    // ========================================================================
    // STEP 4: DETERMINE PASS/FAIL STATUS
    // ========================================================================
    let status = finalPercentage >= 60 ? 'passed' : 'failed';

    // ========================================================================
    // STEP 5: MANAGE ATTEMPT HISTORY
    // ========================================================================
    const previousFinals = await FinalEvaluation.find({
      project: projectId,
      student: studentId
    }).sort({ attemptNumber: -1 });

    const attemptNumber = previousFinals.length > 0 
      ? previousFinals[0].attemptNumber + 1 
      : 1;

    // Mark old finals as not latest (maintain history)
    await FinalEvaluation.updateMany(
      { 
        project: projectId,
        student: studentId,
        isLatest: true
      },
      { isLatest: false }
    );

    // ========================================================================
    // STEP 6: CREATE FINAL EVALUATION RECORD
    // ========================================================================
    const finalEvaluation = await FinalEvaluation.create({
      project: projectId,
      student: studentId,
      team: teamId,
      groupEvaluation: groupEvaluation ? groupEvaluation._id : null,
      individualEvaluation: individualEval._id,
      groupScore,
      individualScore,
      finalScore,
      finalPercentage,
      status,
      verbalGrade,
      isLatest: true,
      attemptNumber
    });

    // ========================================================================
    // STEP 7: IF PASSED - AWARD BADGES & UPDATE LEVEL
    // ========================================================================
    if (status === 'passed') {
      // ---------------------------------------------------------------------
      // 7A: AWARD PROJECT BADGE
      // ---------------------------------------------------------------------
      await awardProjectBadge(projectId, studentId, finalEvaluation._id);

      // ---------------------------------------------------------------------
      // 7B: UPDATE STUDENT LEVEL
      // ---------------------------------------------------------------------
      const newLevel = await updateStudentLevel(projectId, studentId, finalPercentage);

      // ---------------------------------------------------------------------
      // 7C: AWARD LEVEL BADGE (IF LEVEL CHANGED)
      // ---------------------------------------------------------------------
      await awardLevelBadge(studentId, newLevel);

    }

    // ========================================================================
    // STEP 8: RETURN SUCCESS RESPONSE
    // ========================================================================
    res.json({
      success: true,
      message: status === 'passed' 
        ? 'تم حساب التقييم النهائي بنجاح - مبروك النجاح!' 
        : 'تم حساب التقييم النهائي',
      data: finalEvaluation
    });

  } catch (error) {
    console.error('Finalize Evaluation Error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حساب التقييم النهائي',
      error: error.message
    });
  }
};

// ============================================================================
// HELPER FUNCTIONS FOR BADGE AWARDING & LEVEL PROGRESSION
// ============================================================================

/**
 * Award project badge to student
 * Prevents duplicate badge awarding
 * 
 * @param {String} projectId - Project ID
 * @param {String} studentId - Student ID
 * @param {String} finalEvalId - Final Evaluation ID
 */
async function awardProjectBadge(projectId, studentId, finalEvalId) {
  try {
    // Find or create project badge
    let badge = await Badge.findOne({ project: projectId });
    
    if (!badge) {
      // Create default badge if doesn't exist
      const project = await Project.findById(projectId);
      badge = await Badge.create({
        name: `${project.title} Badge`,
        description: `شارة إتمام مشروع ${project.title}`,
        icon: '🎖️',
        color: '#4CAF50',
        project: projectId,
        createdBy: project.instructor,
        awardedTo: []
      });
    }

    // Check if already awarded
    const alreadyAwarded = badge.awardedTo.some(
      award => award.student.toString() === studentId.toString()
    );
    
    if (!alreadyAwarded) {
      badge.awardedTo.push({
        student: studentId,
        awardedAt: new Date(),
        evaluationAttempt: finalEvalId
      });
      await badge.save();
      
      console.log(`✓ Project badge awarded to student ${studentId}`);
    } else {
      console.log(`✓ Project badge already awarded to student ${studentId}`);
    }

    // Add badge reference to StudentLevel
    const studentLevel = await StudentLevel.findOne({ student: studentId });
    if (studentLevel) {
      const badgeExists = studentLevel.badges.some(
        b => b.badge.toString() === badge._id.toString()
      );
      
      if (!badgeExists) {
        studentLevel.badges.push({
          badge: badge._id,
          awardedAt: new Date()
        });
        await studentLevel.save();
      }
    }
    
    return badge;
  } catch (error) {
    console.error('Error awarding project badge:', error);
    // Don't throw - badge awarding shouldn't break finalization
  }
}

/**
 * Update student level based on highest passed project
 * 
 * Level Mapping:
 * - Projects 1-2: Beginner
 * - Projects 3-4: Intermediate  
 * - Project 5: Advanced
 * - Project 6: Expert
 * 
 * @param {String} projectId - Project ID
 * @param {String} studentId - Student ID
 * @param {Number} finalPercentage - Final score percentage
 * @returns {String} New level
 */
async function updateStudentLevel(projectId, studentId, finalPercentage) {
  try {
    const project = await Project.findById(projectId);
    
    // Determine level for this project
    const projectLevelMap = {
      1: 'beginner', 
      2: 'beginner',
      3: 'intermediate', 
      4: 'intermediate',
      5: 'advanced',
      6: 'expert'
    };

    const thisProjectLevel = projectLevelMap[project.projectOrder] || 'beginner';

    // Get or create StudentLevel record
    let studentLevel = await StudentLevel.findOne({ student: studentId });
    
    if (!studentLevel) {
      studentLevel = await StudentLevel.create({
        student: studentId,
        currentLevel: 'beginner',
        completedProjects: [],
        badges: []
      });
    }

    // Check if this project already completed
    const alreadyCompleted = studentLevel.completedProjects.some(
      cp => cp.project.toString() === projectId.toString()
    );

    if (!alreadyCompleted) {
      // Add to completed projects
      studentLevel.completedProjects.push({
        project: projectId,
        projectLevel: thisProjectLevel,
        completedAt: new Date(),
        finalScore: finalPercentage
      });
    } else {
      // Update existing entry (retry case)
      const existingIndex = studentLevel.completedProjects.findIndex(
        cp => cp.project.toString() === projectId.toString()
      );
      
      if (existingIndex !== -1) {
        studentLevel.completedProjects[existingIndex].completedAt = new Date();
        studentLevel.completedProjects[existingIndex].finalScore = finalPercentage;
        studentLevel.completedProjects[existingIndex].projectLevel = thisProjectLevel;
      }
    }

    // Determine highest level achieved
    const levelHierarchy = {
      'beginner': 1,
      'intermediate': 2,
      'advanced': 3,
      'expert': 4
    };

    let highestLevel = 'beginner';
    let highestLevelValue = 1;

    for (const completed of studentLevel.completedProjects) {
      const levelValue = levelHierarchy[completed.projectLevel] || 1;
      if (levelValue > highestLevelValue) {
        highestLevelValue = levelValue;
        highestLevel = completed.projectLevel;
      }
    }

    // Update current level (never downgrade)
    const currentLevelValue = levelHierarchy[studentLevel.currentLevel] || 1;
    if (highestLevelValue > currentLevelValue) {
      studentLevel.currentLevel = highestLevel;
      console.log(`✓ Student ${studentId} leveled up to ${highestLevel}`);
    } else {
      console.log(`✓ Student ${studentId} remains at ${studentLevel.currentLevel}`);
    }

    await studentLevel.save();
    
    return highestLevel;
  } catch (error) {
    console.error('Error updating student level:', error);
    return 'beginner'; // Safe fallback
  }
}

/**
 * Award level badge when student reaches new level
 * Creates level badges if they don't exist
 * 
 * @param {String} studentId - Student ID
 * @param {String} level - Level achieved (beginner/intermediate/advanced/expert)
 */
async function awardLevelBadge(studentId, level) {
  try {
    // Level badge definitions
    const levelBadgeDefinitions = {
      'beginner': {
        name: 'مبتدئ',
        description: 'شارة المستوى المبتدئ',
        icon: '🌱',
        color: '#8BC34A'
      },
      'intermediate': {
        name: 'متوسط',
        description: 'شارة المستوى المتوسط',
        icon: '📘',
        color: '#2196F3'
      },
      'advanced': {
        name: 'متقدم',
        description: 'شارة المستوى المتقدم',
        icon: '🎓',
        color: '#9C27B0'
      },
      'expert': {
        name: 'خبير',
        description: 'شارة المستوى الخبير',
        icon: '🏆',
        color: '#FFD700'
      }
    };

    const badgeInfo = levelBadgeDefinitions[level];
    if (!badgeInfo) return;

    // Find or create level badge (use a special project ID for level badges)
    let levelBadge = await Badge.findOne({ 
      name: badgeInfo.name,
      description: badgeInfo.description
    });

    if (!levelBadge) {
      // Create system badge for this level
      levelBadge = await Badge.create({
        name: badgeInfo.name,
        description: badgeInfo.description,
        icon: badgeInfo.icon,
        color: badgeInfo.color,
        project: null, // Level badges not tied to specific project
        createdBy: null, // System-generated
        awardedTo: []
      });
    }

    // Check if already awarded
    const alreadyAwarded = levelBadge.awardedTo.some(
      award => award.student.toString() === studentId.toString()
    );

    if (!alreadyAwarded) {
      levelBadge.awardedTo.push({
        student: studentId,
        awardedAt: new Date()
      });
      await levelBadge.save();
      
      console.log(`✓ Level badge "${badgeInfo.name}" awarded to student ${studentId}`);
    }

    // Add to StudentLevel badges array
    const studentLevel = await StudentLevel.findOne({ student: studentId });
    if (studentLevel) {
      const badgeExists = studentLevel.badges.some(
        b => b.badge && b.badge.toString() === levelBadge._id.toString()
      );
      
      if (!badgeExists) {
        studentLevel.badges.push({
          badge: levelBadge._id,
          awardedAt: new Date()
        });
        await studentLevel.save();
      }
    }
  } catch (error) {
    console.error('Error awarding level badge:', error);
  }
}

// @desc    Get final evaluation for a student
// @route   GET /api/assessment/final/:projectId/:studentId
// @access  Private
exports.getFinalEvaluation = async (req, res) => {
  try {
    const { projectId, studentId } = req.params;

    const finalEvaluation = await FinalEvaluation.findOne({
      project: projectId,
      student: studentId,
      isLatest: true
    })
      .populate('project', 'title isTeamProject')
      .populate('student', 'name email')
      .populate('groupEvaluation')
      .populate('individualEvaluation');

    if (!finalEvaluation) {
      return res.json({
        success: true,
        data: null,
        message: 'التقييم النهائي غير متاح بعد'
      });
    }

    res.json({
      success: true,
      data: finalEvaluation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التقييم النهائي',
      error: error.message
    });
  }
};

// @desc    Get all final evaluations for a project
// @route   GET /api/assessment/final-all/:projectId
// @access  Private (Teacher/Admin)
exports.getAllFinalEvaluations = async (req, res) => {
  try {
    const { projectId } = req.params;

    const finalEvaluations = await FinalEvaluation.find({
      project: projectId,
      isLatest: true
    })
      .populate('student', 'name email')
      .populate('team', 'name')
      .sort({ finalPercentage: -1 });

    res.json({
      success: true,
      data: finalEvaluations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التقييمات النهائية',
      error: error.message
    });
  }
};

// ============================================================================
// RETRY MANAGEMENT
// ============================================================================

// @desc    Allow retry for a full team (all members)
// @route   POST /api/assessment/allow-retry
// @access  Private (Teacher/Admin)
// Body: { teamId, projectId }
exports.allowRetry = async (req, res) => {
  try {
    const { projectId, teamId } = req.body;

    if (!projectId || !teamId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد المشروع والفريق'
      });
    }

    const project = await Project.findById(projectId).select('instructor');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    if (req.user.role !== 'admin' && project.instructor?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالسماح بإعادة المحاولة لهذا المشروع'
      });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'الفريق غير موجود'
      });
    }

    const memberIds = team.members.map((m) => m.user).filter(Boolean);
    if (!memberIds.length) {
      return res.status(400).json({
        success: false,
        message: 'لا يوجد أعضاء في الفريق'
      });
    }

    // Delete final_delivery submissions to reset the team back to incomplete final delivery stage
    await TeamSubmission.deleteMany({
      team: teamId,
      project: projectId,
      stageKey: 'final_delivery'
    });

    // Set retryAllowed in TeamProject enrollment
    await TeamProject.updateOne(
      {
        team: teamId,
        project: projectId
      },
      { retryAllowed: true }
    );

    // Allow new attempts for all team members without deleting or resetting existing submissions.
    await EvaluationAttempt.updateMany(
      {
        project: projectId,
        student: { $in: memberIds },
        isLatestAttempt: true
      },
      { retryAllowed: true }
    );

    return res.json({
      success: true,
      message: 'تم فتح إعادة المحاولة للفريق - تم حذف التسليم النهائي ليسلموا مرة أخرى'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في السماح بإعادة المحاولة',
      error: error.message
    });
  }
};

// @desc    Get all evaluation attempts for a student
// @route   GET /api/assessment/attempts/:projectId/:studentId
// @access  Private
exports.getStudentAttempts = async (req, res) => {
  try {
    const { projectId, studentId } = req.params;

    const attempts = await EvaluationAttempt.find({
      project: projectId,
      student: studentId
    })
      .sort({ phase: 1, attemptNumber: -1 })
      .populate('evaluator', 'name');

    const finalAttempts = await FinalEvaluation.find({
      project: projectId,
      student: studentId
    }).sort({ attemptNumber: -1 });

    res.json({
      success: true,
      data: {
        evaluationAttempts: attempts,
        finalAttempts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب محاولات التقييم',
      error: error.message
    });
  }
};

// ============================================================================
// STUDENT LEVEL & BADGES
// ============================================================================

// @desc    Get student level and progress
// @route   GET /api/assessment/student-level/:studentId
// @access  Private
exports.getStudentLevel = async (req, res) => {
  try {
    const { studentId } = req.params;

    let studentLevel = await StudentLevel.findOne({ student: studentId })
      .populate('completedProjects.project', 'title projectLevel')
      .populate('badges.badge');

    if (!studentLevel) {
      // Create default level
      studentLevel = await StudentLevel.create({
        student: studentId,
        currentLevel: 'beginner',
        completedProjects: [],
        badges: []
      });
    }

    res.json({
      success: true,
      data: studentLevel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب مستوى الطالب',
      error: error.message
    });
  }
};

// @desc    Get student badges
// @route   GET /api/assessment/badges/:studentId
// @access  Private
exports.getStudentBadges = async (req, res) => {
  try {
    const badges = await Badge.find({
      'awardedTo.student': req.params.studentId
    }).populate('project', 'title');

    const studentBadges = badges.map(badge => {
      const award = badge.awardedTo.find(
        a => a.student.toString() === req.params.studentId
      );
      return {
        _id: badge._id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        color: badge.color,
        project: badge.project,
        awardedAt: award.awardedAt
      };
    });

    res.json({
      success: true,
      data: studentBadges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الشارات',
      error: error.message
    });
  }
};

// @desc    Create or update badge for a project
// @route   POST /api/assessment/badge
// @access  Private (Teacher/Admin)
exports.createOrUpdateBadge = async (req, res) => {
  try {
    const { projectId, name, description, icon, color } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    if (project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل الشارة'
      });
    }

    let badge = await Badge.findOne({ project: projectId });

    if (badge) {
      badge.name = name;
      badge.description = description;
      badge.icon = icon;
      badge.color = color;
      await badge.save();
    } else {
      badge = await Badge.create({
        project: projectId,
        name,
        description,
        icon,
        color,
        createdBy: req.user.id
      });
    }

    res.json({
      success: true,
      message: 'تم حفظ الشارة بنجاح',
      data: badge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ الشارة',
      error: error.message
    });
  }
};

// @desc    Get badge for a project
// @route   GET /api/assessment/badge/:projectId
// @access  Private
exports.getProjectBadge = async (req, res) => {
  try {
    const badge = await Badge.findOne({ 
      project: req.params.projectId 
    }).populate('project', 'title');

    res.json({
      success: true,
      data: badge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الشارة',
      error: error.message
    });
  }
};

// @desc    Get observation card for a project
// @route   GET /api/assessment/observation-card/:projectId
// @access  Private
exports.getObservationCard = async (req, res) => {
  try {
    const observationCard = await ObservationCard.findOne({ 
      project: req.params.projectId 
    }).populate('project', 'title');

    if (!observationCard) {
      return res.status(404).json({
        success: false,
        message: 'بطاقة الملاحظة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: observationCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بطاقة الملاحظة',
      error: error.message
    });
  }
};

// @desc    Create evaluation attempt
// @route   POST /api/assessment/evaluate
// @access  Private (Teacher/Admin)
exports.createEvaluation = async (req, res) => {
  try {
    const { 
      submissionId, 
      assessmentPartEvaluations, 
      feedbackSummary,
      retryAllowed 
    } = req.body;

    // Get submission with related data
    const submission = await Submission.findById(submissionId)
      .populate('project')
      .populate('student');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'التسليم غير موجود'
      });
    }

    // Verify permission
    if (submission.project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتقييم هذا التسليم'
      });
    }

    // Get observation card
    const observationCard = await ObservationCard.findOne({ 
      project: submission.project._id 
    });

    if (!observationCard) {
      return res.status(404).json({
        success: false,
        message: 'بطاقة الملاحظة غير موجودة لهذا المشروع'
      });
    }

    // Calculate scores
    let finalScore = 0;
    const processedEvaluations = [];

    for (const partEval of assessmentPartEvaluations) {
      const partTemplate = observationCard.assessmentParts.find(
        p => p.name === partEval.partName
      );
      
      if (!partTemplate) continue;

      let partScore = 0;
      const processedSections = [];

      for (const sectionEval of partEval.sectionEvaluations) {
        const sectionTemplate = partTemplate.sections.find(
          s => s.name === sectionEval.sectionName
        );
        
        if (!sectionTemplate) continue;

        // Calculate average of criterion percentages for this section
        const avgPercentage = sectionEval.criterionSelections.reduce(
          (sum, crit) => sum + crit.selectedPercentage, 0
        ) / sectionEval.criterionSelections.length;

        // Apply section weight
        const sectionScore = avgPercentage * (sectionTemplate.weight / 100);
        partScore += sectionScore;

        processedSections.push({
          sectionName: sectionEval.sectionName,
          sectionWeight: sectionTemplate.weight,
          criterionSelections: sectionEval.criterionSelections,
          calculatedSectionScore: sectionScore
        });
      }

      // Apply part weight to final score
      finalScore += partScore * (partTemplate.weight / 100);

      processedEvaluations.push({
        partName: partEval.partName,
        partWeight: partTemplate.weight,
        sectionEvaluations: processedSections,
        calculatedPartScore: partScore
      });
    }

    // Determine pass/fail status (60% threshold)
    const status = finalScore >= 60 ? 'passed' : 'failed';

    // Get current attempt number
    const previousAttempts = await EvaluationAttempt.find({
      project: submission.project._id,
      student: submission.student._id
    }).sort({ attemptNumber: -1 });

    const attemptNumber = previousAttempts.length > 0 
      ? previousAttempts[0].attemptNumber + 1 
      : 1;

    // Mark previous attempts as not latest
    await EvaluationAttempt.updateMany(
      { 
        project: submission.project._id,
        student: submission.student._id,
        isLatestAttempt: true
      },
      { isLatestAttempt: false }
    );

    // Create new evaluation attempt
    const evaluation = await EvaluationAttempt.create({
      project: submission.project._id,
      student: submission.student._id,
      submission: submissionId,
      observationCard: observationCard._id,
      evaluator: req.user.id,
      attemptNumber,
      assessmentPartEvaluations: processedEvaluations,
      finalScore,
      status,
      feedbackSummary,
      retryAllowed: status === 'failed' ? retryAllowed : false,
      isLatestAttempt: true
    });

    // Update submission status
    submission.evaluationStatus = status;
    submission.evaluationAttempt = evaluation._id;
    submission.finalScore = finalScore;
    await submission.save();

    // Award badge if passed
    if (status === 'passed') {
      const badge = await Badge.findOne({ project: submission.project._id });
      if (badge) {
        // Check if student already has this badge
        const alreadyAwarded = badge.awardedTo.some(
          award => award.student.toString() === submission.student._id.toString()
        );
        
        if (!alreadyAwarded) {
          badge.awardedTo.push({
            student: submission.student._id,
            evaluationAttempt: evaluation._id,
            awardedAt: new Date()
          });
          await badge.save();
        }
      }
    }

    res.json({
      success: true,
      message: 'تم حفظ التقييم بنجاح',
      data: evaluation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ التقييم',
      error: error.message
    });
  }
};

// @desc    Get evaluation attempt for a submission
// @route   GET /api/assessment/evaluation/:submissionId
// @access  Private
exports.getEvaluation = async (req, res) => {
  try {
    const evaluation = await EvaluationAttempt.findOne({
      submission: req.params.submissionId,
      isLatestAttempt: true
    })
      .populate('evaluator', 'name')
      .populate('observationCard');

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'التقييم غير موجود'
      });
    }

    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التقييم',
      error: error.message
    });
  }
};

// @desc    Get all evaluation attempts for a student in a project
// @route   GET /api/assessment/student-attempts/:projectId/:studentId
// @access  Private (Teacher/Admin/Student)
exports.getStudentAttempts = async (req, res) => {
  try {
    const { projectId, studentId } = req.params;

    // Verify permission
    if (req.user.id !== studentId && req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بعرض هذه البيانات'
      });
    }

    const attempts = await EvaluationAttempt.find({
      project: projectId,
      student: studentId
    })
      .sort({ attemptNumber: -1 })
      .populate('evaluator', 'name')
      .populate('submission');

    res.json({
      success: true,
      data: attempts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب محاولات التقييم',
      error: error.message
    });
  }
};

// @desc    Get student badges
// @route   GET /api/assessment/badges/:studentId
// @access  Private
exports.getStudentBadges = async (req, res) => {
  try {
    const badges = await Badge.find({
      'awardedTo.student': req.params.studentId
    }).populate('project', 'title');

    const studentBadges = badges.map(badge => {
      const award = badge.awardedTo.find(
        a => a.student.toString() === req.params.studentId
      );
      return {
        _id: badge._id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        color: badge.color,
        project: badge.project,
        awardedAt: award.awardedAt
      };
    });

    res.json({
      success: true,
      data: studentBadges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الشارات',
      error: error.message
    });
  }
};

// @desc    Create or update badge for a project
// @route   POST /api/assessment/badge
// @access  Private (Teacher/Admin)
exports.createOrUpdateBadge = async (req, res) => {
  try {
    const { projectId, name, description, icon, color } = req.body;

    // Verify project exists and user has permission
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    if (project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل الشارة'
      });
    }

    let badge = await Badge.findOne({ project: projectId });

    if (badge) {
      badge.name = name;
      badge.description = description;
      badge.icon = icon;
      badge.color = color;
      await badge.save();
    } else {
      badge = await Badge.create({
        project: projectId,
        name,
        description,
        icon,
        color,
        createdBy: req.user.id
      });
    }

    res.json({
      success: true,
      message: 'تم حفظ الشارة بنجاح',
      data: badge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ الشارة',
      error: error.message
    });
  }
};

// @desc    Get badge for a project
// @route   GET /api/assessment/badge/:projectId
// @access  Private
exports.getProjectBadge = async (req, res) => {
  try {
    const badge = await Badge.findOne({ 
      project: req.params.projectId 
    }).populate('project', 'title');

    res.json({
      success: true,
      data: badge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الشارة',
      error: error.message
    });
  }
};
