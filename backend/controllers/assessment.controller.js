const ObservationCard = require('../models/ObservationCard.model');
const EvaluationAttempt = require('../models/EvaluationAttempt.model');
const FinalEvaluation = require('../models/FinalEvaluation.model');
const StudentLevel = require('../models/StudentLevel.model');
const Badge = require('../models/Badge.model');
const Submission = require('../models/Submission.model');
const Project = require('../models/Project.model');

// @desc    Create or update observation card for a project phase
// @route   POST /api/assessment/observation-card
// @access  Private (Teacher/Admin)
exports.createOrUpdateObservationCard = async (req, res) => {
  try {
    const { projectId, phase, sections } = req.body;

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

    // Check if observation card already exists for this phase
    let observationCard = await ObservationCard.findOne({ 
      project: projectId,
      phase 
    });

    if (observationCard) {
      // Update existing
      observationCard.sections = sections;
      await observationCard.save();
    } else {
      // Create new
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
