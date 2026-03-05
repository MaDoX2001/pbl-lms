const { GoogleGenerativeAI } = require('@google/generative-ai');
const Progress = require('../models/Progress.model');
const StudentLevel = require('../models/StudentLevel.model');
const Team = require('../models/Team.model');
const AIChatHistory = require('../models/AIChatHistory.model');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model fallback order — gemini-2.5-flash dropped (10K RPD cap)
const DEFAULT_AI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
];

const envModels = (process.env.AI_MODELS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const AI_MODELS = envModels.length > 0 ? envModels : DEFAULT_AI_MODELS;

const MAX_INPUT_CHARS = Number(process.env.AI_MAX_INPUT_CHARS || 4000);
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 600);

const STUDENT_SYSTEM_PROMPT = `أنت مساعد ذكي داخل منصة التعلم بالمشروعات (PBL LMS). هدفك: الإرشاد داخل المنصة + دعم التعلم التقني العملي.

مهامك الأساسية:
1) الإرشاد داخل المنصة:
- ساعد الطالب خطوة بخطوة (المشروعات، التقييم، التقدم، الفرق، التسليمات).
- استخدم بيانات الطالب المتوفرة لتقديم مساعدة مخصصة وليس عامة.
- إذا كان في المشروع الحالي خطوة ناقصة، اذكرها بالاسم.

2) دعم البرمجة وتصحيح الأخطاء:
- مع أي خطأ برمجي: تشخيص سريع ثم خطوات إصلاح.
- قدّم كود مصحح عند الحاجة مع شرح سبب الخطأ.
- اطلب رسالة الخطأ الكاملة ونوع اللوحة/المكتبات إذا لم تُذكر.

3) دعم Arduino والإلكترونيات:
- اشرح القطع الإلكترونية بطريقة بسيطة.
- اربط بين: التوصيل الكهربائي + الكود + النتيجة المتوقعة.
- أعطِ checklist للتحقق من التوصيل قبل تعديل الكود.

4) شرح الدرجات والتقييم:
- إذا سأل الطالب عن درجاته أو تقييمه، اشرح له بناءً على بيانات المشاريع المتوفرة.
- إذا كان في مشروع مكتمل بدرجة منخفضة، اقترح ما يمكن تحسينه.

أسلوب الرد:
- واضح، عملي، ومختصر.
- إذا كان السؤال بالعربي أجب بالعربي، وإذا كان بالإنجليزي أجب بالإنجليزي.
- استخدم code blocks (\`\`\`language ... \`\`\`) للكود البرمجي فقط.
- للنص العادي: لا تستخدم * أو # في بداية السطور.
- رتب الرد: فكرة سريعة ← خطوات عملية ← مثال (عند الحاجة) ← الخطوة التالية.`;

const TEACHER_SYSTEM_PROMPT = `أنت مساعد ذكي للمعلمين داخل منصة التعلم بالمشروعات (PBL LMS).

مهامك الأساسية:
1) مساعدة في التقييم:
- ساعد في كتابة معايير تقييم واضحة وعادلة.
- اقترح أوصاف واضحة لبطاقات الملاحظة.
- ساعد في صياغة أسئلة التقييم الشفهي.

2) إدارة المشاريع:
- اقترح أوصاف مشاريع PBL مناسبة لمستوى الطلاب.
- ساعد في تقسيم المشروع إلى مراحل ومهام واضحة.
- اقترح موارد تعليمية مناسبة.

3) دعم الطلاب:
- ساعد في تحليل تقدم الطلاب وتحديد من يحتاج دعمًا.
- اقترح طرق تدخل لمساعدة الطلاب المتعثرين.

أسلوب الرد:
- مهني، منظم، ومختصر.
- استخدم code blocks للكود البرمجي فقط.
- للنص العادي: لا تستخدم * أو # في بداية السطور.
- أجب بنفس لغة السؤال.`;

// Build dynamic context from user's real data
const buildUserContext = async (user) => {
  if (!user) return '';

  const levelMap = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم', expert: 'خبير' };
  let context = `\n--- بيانات المستخدم ---\nالاسم: ${user.name}\nالدور: ${user.role === 'student' ? 'طالب' : user.role === 'teacher' ? 'معلم' : 'مدير'}\n`;

  if (user.role === 'student') {
    try {
      const [progressList, levelData, team] = await Promise.all([
        Progress.find({ student: user._id }).populate('project', 'title level').lean(),
        StudentLevel.findOne({ student: user._id }).lean(),
        Team.findOne({ members: user._id }).populate('members', 'name').lean(),
      ]);

      const active = progressList.filter(p => p.status !== 'completed');
      const completed = progressList.filter(p => p.status === 'completed');

      if (active.length > 0) {
        context += `\nالمشاريع الحالية (قيد التنفيذ):\n`;
        active.forEach(p => {
          const statusMap = { 'not-started': 'لم يبدأ', 'in-progress': 'جاري', 'submitted': 'مسلّم', 'reviewed': 'مراجع' };
          context += `- ${p.project?.title || 'مشروع'} (${statusMap[p.status] || p.status})\n`;
        });
      }

      if (completed.length > 0) {
        context += `\nالمشاريع المكتملة:\n`;
        completed.forEach(p => {
          const score = p.feedback?.score;
          context += `- ${p.project?.title || 'مشروع'}${score !== undefined ? ` — الدرجة: ${score}%` : ''}\n`;
        });
      }

      if (!active.length && !completed.length) {
        context += `\nلم يلتحق بأي مشروع بعد.\n`;
      }

      if (levelData) {
        context += `\nالمستوى الحالي: ${levelMap[levelData.currentLevel] || levelData.currentLevel}\n`;
      }

      if (team) {
        const memberNames = team.members.map(m => m.name).filter(Boolean).join('، ');
        context += `\nالفريق: ${team.name}\nأعضاء الفريق: ${memberNames}\n`;
      }
    } catch (err) {
      console.warn('Could not build user context:', err.message);
    }
  }

  context += `--- نهاية البيانات ---\n`;
  return context;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// POST /api/ai/chat
const chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const user = req.user;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'مفتاح خدمة الذكاء الاصطناعي غير مضبوط.',
      });
    }

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (message.length > MAX_INPUT_CHARS) {
      return res.status(400).json({
        success: false,
        message: `الرسالة طويلة جدًا. الحد الأقصى ${MAX_INPUT_CHARS} حرف.`,
      });
    }

    // Pick system prompt based on role
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
    const basePrompt = isTeacher ? TEACHER_SYSTEM_PROMPT : STUDENT_SYSTEM_PROMPT;

    // Build personalized context from DB
    const userContext = await buildUserContext(user);
    const fullSystemPrompt = basePrompt + (userContext ? `\n${userContext}` : '');

    // Admin gets full history; others trimmed to last 6
    const trimmedHistory = user?.role === 'admin' ? history : history.slice(-6);

    const chatHistory = trimmedHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    for (let modelIndex = 0; modelIndex < AI_MODELS.length; modelIndex++) {
      const modelName = AI_MODELS[modelIndex];

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          temperature: 0.4,
        },
      });

      const MAX_RETRIES = 2;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const chatSession = model.startChat({
            history: [
              { role: 'user', parts: [{ text: fullSystemPrompt }] },
              { role: 'model', parts: [{ text: 'فهمت. سأساعدك بناءً على بياناتك ومشاريعك.' }] },
              ...chatHistory,
            ],
          });

          const result = await chatSession.sendMessage(message);
          const text = result.response.text();

          console.log(`✅ AI response via ${modelName} (attempt ${attempt + 1})`);

          // Save to DB for admin users only
          if (user?.role === 'admin') {
            try {
              await AIChatHistory.findOneAndUpdate(
                { user: user._id },
                {
                  $push: {
                    messages: {
                      $each: [
                        { role: 'user', content: message },
                        { role: 'assistant', content: text },
                      ],
                    },
                  },
                },
                { upsert: true, new: true }
              );
            } catch (saveErr) {
              console.warn('Could not save admin chat history:', saveErr.message);
            }
          }

          return res.json({ success: true, data: { reply: text, model: modelName } });

        } catch (err) {
          const isRetriable429 = err.status === 429 && attempt < MAX_RETRIES - 1;
          if (isRetriable429) {
            const waitTime = (attempt + 1) * 3000;
            console.warn(`⚠️ ${modelName} rate limited, retrying in ${waitTime / 1000}s...`);
            await sleep(waitTime);
            continue;
          }

          const canTryNextModel = err.status === 404 || err.status === 429;
          if (canTryNextModel && modelIndex < AI_MODELS.length - 1) {
            console.warn(`⚠️ ${modelName} unavailable (${err.status}), trying next model...`);
            break;
          }

          throw err;
        }
      }
    }

    // Should not reach here but just in case
    return res.status(429).json({
      success: false,
      message: 'الخدمة مشغولة حالياً، حاول بعد دقيقة.',
    });

  } catch (error) {
    console.error('Gemini AI error:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدثت مشكلة في الخدمة، حاول مرة أخرى.',
    });
  }
};

// GET /api/ai/history - admin only
const getHistory = async (req, res) => {
  try {
    const user = req.user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const record = await AIChatHistory.findOne({ user: user._id }).lean();
    res.json({ success: true, data: record?.messages || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/ai/history - admin only
const clearHistory = async (req, res) => {
  try {
    const user = req.user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    await AIChatHistory.findOneAndUpdate(
      { user: user._id },
      { $set: { messages: [] } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { chat, getHistory, clearHistory };
