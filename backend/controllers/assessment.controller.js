const ObservationCard = require('../models/ObservationCard.model');
const EvaluationAttempt = require('../models/EvaluationAttempt.model');
const FinalEvaluation = require('../models/FinalEvaluation.model');
const StudentLevel = require('../models/StudentLevel.model');
const Badge = require('../models/Badge.model');
const Submission = require('../models/Submission.model');
const Project = require('../models/Project.model');
const Team = require('../models/Team.model');

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

// @desc    Get observation card by phase
// @route   GET /api/assessment/observation-card/:projectId/:phase
// @access  Private
exports.getObservationCard = async (req, res) => {
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
      submissionId, 
      sectionEvaluations, 
      feedbackSummary 
    } = req.body;

    // Verify project is team-based
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    if (!project.isTeamProject) {
      return res.status(400).json({
        success: false,
        message: 'هذا المشروع ليس مشروع جماعي'
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

    // Get previous attempts count
    const previousAttempts = await EvaluationAttempt.find({
      project: projectId,
      team: teamId,
      phase: 'group'
    }).sort({ attemptNumber: -1 });

    const attemptNumber = previousAttempts.length > 0 
      ? previousAttempts[0].attemptNumber + 1 
      : 1;

    // Mark old attempts as not latest
    await EvaluationAttempt.updateMany(
      { 
        project: projectId,
        team: teamId,
        phase: 'group',
        isLatestAttempt: true
      },
      { isLatestAttempt: false }
    );

    // Create group evaluation
    const groupEvaluation = await EvaluationAttempt.create({
      project: projectId,
      phase: 'group',
      team: teamId,
      submission: submissionId,
      observationCard: observationCard._id,
      evaluator: req.user.id,
      attemptNumber,
      sectionEvaluations: processedSections,
      calculatedScore,
      feedbackSummary,
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
      feedbackSummary 
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
        members: studentId
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

    const latestIndividualEval = await EvaluationAttempt.findOne({
      project: projectId,
      student: studentId,
      phase: 'individual_oral',
      isLatestAttempt: true
    });

    if (!latestIndividualEval) {
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

// ============================================================================
// FINAL EVALUATION
// ============================================================================

// @desc    Finalize evaluation (combine Phase 1 + Phase 2)
// @route   POST /api/assessment/finalize
// @access  Private (Teacher/Admin)
exports.finalizeEvaluation = async (req, res) => {
  try {
    const { projectId, studentId } = req.body;

    // Get project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    // Get individual evaluation
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

    // Get group evaluation if team project
    if (project.isTeamProject) {
      // Find student's team
      const team = await Team.findOne({
        project: projectId,
        members: studentId
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
    }

    const individualScore = individualEval.calculatedScore;

    // Calculate final score
    const finalScore = groupScore + individualScore; // 0-200
    const finalPercentage = (finalScore / 200) * 100; // 0-100%

    // Determine status
    const status = finalPercentage >= 60 ? 'passed' : 'failed';

    // Calculate verbal grade
    let verbalGrade;
    if (finalPercentage >= 85) verbalGrade = 'ممتاز';
    else if (finalPercentage >= 75) verbalGrade = 'جيد جدًا';
    else if (finalPercentage >= 65) verbalGrade = 'جيد';
    else if (finalPercentage >= 60) verbalGrade = 'مقبول';
    else verbalGrade = 'غير مجتاز';

    // Get previous final evaluations count
    const previousFinals = await FinalEvaluation.find({
      project: projectId,
      student: studentId
    }).sort({ attemptNumber: -1 });

    const attemptNumber = previousFinals.length > 0 
      ? previousFinals[0].attemptNumber + 1 
      : 1;

    // Mark old finals as not latest
    await FinalEvaluation.updateMany(
      { 
        project: projectId,
        student: studentId,
        isLatest: true
      },
      { isLatest: false }
    );

    // Create final evaluation
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

    // If passed, award badge and update level
    if (status === 'passed') {
      // Award badge
      const badge = await Badge.findOne({ project: projectId });
      if (badge) {
        const alreadyAwarded = badge.awardedTo.some(
          award => award.student.toString() === studentId.toString()
        );
        
        if (!alreadyAwarded) {
          badge.awardedTo.push({
            student: studentId,
            evaluationAttempt: finalEvaluation._id,
            awardedAt: new Date()
          });
          await badge.save();
        }
      }

      // Update student level
      const projectLevelMap = {
        1: 'beginner', 2: 'beginner',
        3: 'intermediate', 4: 'intermediate',
        5: 'advanced',
        6: 'expert'
      };

      const newLevel = projectLevelMap[project.projectOrder] || 'beginner';

      await StudentLevel.findOneAndUpdate(
        { student: studentId },
        {
          $set: { currentLevel: newLevel },
          $push: {
            completedProjects: {
              project: projectId,
              projectLevel: newLevel,
              completedAt: new Date(),
              finalScore: finalPercentage
            }
          }
        },
        { upsert: true, new: true }
      );
    }

    res.json({
      success: true,
      message: 'تم حساب التقييم النهائي بنجاح',
      data: finalEvaluation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حساب التقييم النهائي',
      error: error.message
    });
  }
};

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
      return res.status(404).json({
        success: false,
        message: 'التقييم النهائي غير موجود'
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

// @desc    Allow retry for a student
// @route   POST /api/assessment/allow-retry
// @access  Private (Teacher/Admin)
exports.allowRetry = async (req, res) => {
  try {
    const { studentId, projectId } = req.body;

    // Mark retry allowed on both evaluations
    await EvaluationAttempt.updateMany(
      {
        project: projectId,
        student: studentId,
        isLatestAttempt: true
      },
      { retryAllowed: true }
    );

    res.json({
      success: true,
      message: 'تم السماح بإعادة المحاولة'
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
