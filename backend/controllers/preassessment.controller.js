const PreAssessment = require('../models/PreAssessment.model');
const User = require('../models/User.model');

// Test questions with correct answers
const QUESTIONS = {
  technicalReadiness: [
    { id: 'tech1', text: 'أستطيع استخدام المنصات التعليمية الإلكترونية بسهولة', type: 'likert' },
    { id: 'tech2', text: 'أستطيع رفع وتحميل الملفات من الإنترنت', type: 'likert' },
    { id: 'tech3', text: 'لدي اتصال إنترنت مستقر', type: 'likert' },
    { id: 'tech4', text: 'أستطيع التعامل مع المتصفحات ومحركات البحث', type: 'likert' }
  ],
  programmingReadiness: [
    { id: 'prog1', text: 'ما هي المتغيرات في البرمجة؟', type: 'mcq', options: ['أوامر طباعة', 'أماكن لتخزين البيانات', 'لغات برمجة', 'لا أعلم'], answer: 1 },
    { id: 'prog2', text: 'الجملة الشرطية if تستخدم لـ:', type: 'mcq', options: ['تكرار الكود', 'اتخاذ قرار بناءً على شرط', 'تعريف متغير', 'لا أعلم'], answer: 1 },
    { id: 'prog3', text: 'أستطيع قراءة وفهم كود برمجي بسيط', type: 'likert' },
    { id: 'prog4', text: 'أعرف الفرق بين الحلقة while والحلقة for', type: 'likert' }
  ],
  arduinoReadiness: [
    { id: 'ard1', text: 'Arduino هي:', type: 'mcq', options: ['لغة برمجة', 'منصة إلكترونية مفتوحة المصدر', 'نظام تشغيل', 'لا أعلم'], answer: 1 },
    { id: 'ard2', text: 'الدالتان setup() و loop() في Arduino تستخدمان لـ:', type: 'mcq', options: ['تعريف المتغيرات فقط', 'التهيئة الأولية والتنفيذ المتكرر', 'الطباعة على الشاشة', 'لا أعلم'], answer: 1 },
    { id: 'ard3', text: 'سبق لي استخدام Arduino أو قرأت عنه', type: 'likert' },
    { id: 'ard4', text: 'أعرف كيفية توصيل LED بـ Arduino', type: 'likert' }
  ],
  smartSystemsReadiness: [
    { id: 'smart1', text: 'الأنظمة الذكية هي أنظمة تستطيع:', type: 'mcq', options: ['العمل فقط بأمر مباشر', 'جمع البيانات واتخاذ قرارات', 'العمل بدون كهرباء', 'لا أعلم'], answer: 1 },
    { id: 'smart2', text: 'المستشعرات (Sensors) تستخدم لـ:', type: 'mcq', options: ['عرض البيانات', 'جمع البيانات من البيئة', 'تخزين الملفات', 'لا أعلم'], answer: 1 },
    { id: 'smart3', text: 'أفهم الفرق بين الأنظمة التقليدية والذكية', type: 'likert' },
    { id: 'smart4', text: 'أعرف أمثلة على أنظمة ذكية في حياتنا اليومية', type: 'likert' }
  ],
  projectLearningReadiness: [
    { id: 'proj1', text: 'أستطيع العمل ضمن فريق بكفاءة', type: 'likert' },
    { id: 'proj2', text: 'أستطيع إدارة وقتي لإنجاز المهام في الموعد', type: 'likert' },
    { id: 'proj3', text: 'أفضل التعلم من خلال المشاريع العملية', type: 'likert' },
    { id: 'proj4', text: 'أتقبل الملاحظات والنقد البناء', type: 'likert' }
  ]
};

// Calculate dimension scores
const calculateDimensionScore = (dimensionQuestions, answers) => {
  let totalPoints = 0;
  let maxPoints = 0;

  dimensionQuestions.forEach(q => {
    const userAnswer = answers.get(q.id);
    
    if (q.type === 'likert') {
      totalPoints += parseInt(userAnswer) || 0;
      maxPoints += 5;
    } else if (q.type === 'mcq') {
      totalPoints += (parseInt(userAnswer) === q.answer) ? 5 : 0;
      maxPoints += 5;
    }
  });

  return maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
};

// Get questions
exports.getQuestions = async (req, res) => {
  try {
    // Return questions as array of dimensions for frontend
    const questionsForClient = [
      {
        dimension: 'Technical Readiness',
        questions: QUESTIONS.technicalReadiness.map(q => ({
          id: q.id,
          question: q.text,
          type: q.type,
          options: q.type === 'likert' 
            ? ['1 - لا أوافق بشدة', '2 - لا أوافق', '3 - محايد', '4 - أوافق', '5 - أوافق بشدة']
            : q.options
        }))
      },
      {
        dimension: 'Programming Readiness',
        questions: QUESTIONS.programmingReadiness.map(q => ({
          id: q.id,
          question: q.text,
          type: q.type,
          options: q.type === 'likert' 
            ? ['1 - لا أوافق بشدة', '2 - لا أوافق', '3 - محايد', '4 - أوافق', '5 - أوافق بشدة']
            : q.options
        }))
      },
      {
        dimension: 'Arduino Readiness',
        questions: QUESTIONS.arduinoReadiness.map(q => ({
          id: q.id,
          question: q.text,
          type: q.type,
          options: q.type === 'likert' 
            ? ['1 - لا أوافق بشدة', '2 - لا أوافق', '3 - محايد', '4 - أوافق', '5 - أوافق بشدة']
            : q.options
        }))
      },
      {
        dimension: 'Smart Systems Readiness',
        questions: QUESTIONS.smartSystemsReadiness.map(q => ({
          id: q.id,
          question: q.text,
          type: q.type,
          options: q.type === 'likert' 
            ? ['1 - لا أوافق بشدة', '2 - لا أوافق', '3 - محايد', '4 - أوافق', '5 - أوافق بشدة']
            : q.options
        }))
      },
      {
        dimension: 'Project Learning Readiness',
        questions: QUESTIONS.projectLearningReadiness.map(q => ({
          id: q.id,
          question: q.text,
          type: q.type,
          options: q.type === 'likert' 
            ? ['1 - لا أوافق بشدة', '2 - لا أوافق', '3 - محايد', '4 - أوافق', '5 - أوافق بشدة']
            : q.options
        }))
      }
    ];

    res.json(questionsForClient);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الأسئلة'
    });
  }
};

// Submit pre-assessment
exports.submitPreAssessment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { answers } = req.body;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'الاختبار مخصص للطلاب فقط'
      });
    }

    // Check if already completed
    if (req.user.preAssessmentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'لقد أكملت الاختبار مسبقاً'
      });
    }

    // Convert answers to Map
    const answersMap = new Map(Object.entries(answers));

    // Calculate scores for each dimension
    const dimensionScores = {
      technicalReadiness: calculateDimensionScore(QUESTIONS.technicalReadiness, answersMap),
      programmingReadiness: calculateDimensionScore(QUESTIONS.programmingReadiness, answersMap),
      arduinoReadiness: calculateDimensionScore(QUESTIONS.arduinoReadiness, answersMap),
      smartSystemsReadiness: calculateDimensionScore(QUESTIONS.smartSystemsReadiness, answersMap),
      projectLearningReadiness: calculateDimensionScore(QUESTIONS.projectLearningReadiness, answersMap)
    };

    // Calculate total score (average)
    const totalScore = Math.round(
      (dimensionScores.technicalReadiness +
       dimensionScores.programmingReadiness +
       dimensionScores.arduinoReadiness +
       dimensionScores.smartSystemsReadiness +
       dimensionScores.projectLearningReadiness) / 5
    );

    // Determine readiness level
    let readinessLevel = 'low';
    if (totalScore >= 70) readinessLevel = 'high';
    else if (totalScore >= 50) readinessLevel = 'medium';

    // Save assessment
    await PreAssessment.create({
      user: userId,
      answers: answersMap,
      dimensionScores,
      totalScore,
      readinessLevel
    });

    // Update user status - THIS IS THE SINGLE SOURCE OF TRUTH
    await User.findByIdAndUpdate(userId, {
      preAssessmentStatus: 'completed',
      preAssessmentScore: totalScore
    });

    // Get updated user
    const updatedUser = await User.findById(userId)
      .populate('enrolledProjects', 'title')
      .populate('completedProjects', 'title');

    res.json({
      success: true,
      message: 'تم إكمال الاختبار بنجاح',
      data: {
        dimensionScores,
        totalScore,
        readinessLevel,
        user: updatedUser // Return full updated user
      }
    });
  } catch (error) {
    console.error('Submit assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في حفظ الاختبار'
    });
  }
};
