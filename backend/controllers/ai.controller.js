const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const DEFAULT_AI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

const envModels = (process.env.AI_MODELS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const AI_MODELS = [...new Set([...envModels, ...DEFAULT_AI_MODELS])];

const MAX_INPUT_CHARS = Number(process.env.AI_MAX_INPUT_CHARS || 1200);
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 220);
const MAX_REQUESTS_PER_MINUTE = Number(process.env.AI_MAX_REQUESTS_PER_MINUTE || 3);
const MAX_REQUESTS_PER_DAY = Number(process.env.AI_MAX_REQUESTS_PER_DAY || 15);
const GLOBAL_MAX_REQUESTS_PER_MINUTE = Number(process.env.AI_GLOBAL_MAX_REQUESTS_PER_MINUTE || 6);
const GLOBAL_MAX_REQUESTS_PER_DAY = Number(process.env.AI_GLOBAL_MAX_REQUESTS_PER_DAY || 250);

function getDayKey() {
  return new Date().toISOString().slice(0, 10);
}

const userRateLimit = new Map();
const globalRateLimit = {
  minuteWindowStart: Date.now(),
  minuteCount: 0,
  dayKey: getDayKey(),
  dayCount: 0,
};

const SYSTEM_PROMPT = `أنت مساعد ذكي داخل منصة التعلم بالمشروعات (PBL LMS) وهدفك: الإرشاد داخل المنصة + دعم التعلم التقني العملي.

مهامك الأساسية:
1) الإرشاد داخل المنصة:
- ساعد الطالب يفهم يعمل إيه خطوة بخطوة داخل المنصة (المشروعات، التقييم، التقدم، الفرق، التسليمات).
- لو السؤال عام، اقترح له المسار التالي العملي داخل المنصة بدل الكلام النظري فقط.

2) دعم البرمجة وتصحيح الأخطاء:
- مع أي خطأ برمجي: اعرض تشخيص سريع ثم خطوات إصلاح مرتبة.
- اطلب المعلومات الناقصة المهمة فقط (رسالة الخطأ، الكود المتعلق، نوع اللوحة/المكتبات).
- قدّم نسخة كود مصححة عند الحاجة، واشرح لماذا الخطأ حصل وكيف يتجنب تكراره.

3) دعم Arduino والإلكترونيات:
- اشرح القطع الإلكترونية (الحساسات، المحركات، الـ LEDs، المقاومات...) بطريقة بسيطة ثم عملية.
- اربط بين: التوصيل الكهربائي + الكود + النتيجة المتوقعة + طريقة الاختبار.
- عند الشك في التوصيل، أعطِ checklist سريعة للتحقق قبل تعديل الكود.

أسلوب الرد:
- واضح، عملي، ومختصر قدر الإمكان.
- إذا كان السؤال بالعربي أجب بالعربي، وإذا كان بالإنجليزي أجب بالإنجليزي.
- استخدم تنسيق نص عادي فقط بدون Markdown.
- ممنوع استخدام الرموز التالية في بداية السطور: # ، * ، - ، ```.
- رتّب الرد بهذا الشكل دائمًا عند الشرح:
  1) فكرة سريعة
  2) خطوات عملية
  3) مثال قصير (عند الحاجة)
  4) ماذا تفعل بعد ذلك
- اجعل الجمل قصيرة وواضحة، وتجنب خلط عربي/إنجليزي إلا للمصطلحات التقنية الضرورية.`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanupOldRateLimits = () => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const [userId, data] of userRateLimit.entries()) {
    if (now - data.lastSeen > oneDayMs) {
      userRateLimit.delete(userId);
    }
  }
};

const checkAndUpdateGlobalRateLimit = () => {
  const now = Date.now();
  const currentDay = getDayKey();

  if (globalRateLimit.dayKey !== currentDay) {
    globalRateLimit.dayKey = currentDay;
    globalRateLimit.dayCount = 0;
  }

  if (now - globalRateLimit.minuteWindowStart >= 60 * 1000) {
    globalRateLimit.minuteWindowStart = now;
    globalRateLimit.minuteCount = 0;
  }

  if (globalRateLimit.minuteCount >= GLOBAL_MAX_REQUESTS_PER_MINUTE) {
    return { allowed: false, type: 'minute' };
  }

  if (globalRateLimit.dayCount >= GLOBAL_MAX_REQUESTS_PER_DAY) {
    return { allowed: false, type: 'day' };
  }

  globalRateLimit.minuteCount += 1;
  globalRateLimit.dayCount += 1;

  return { allowed: true };
};

const checkAndUpdateRateLimit = (userId) => {
  const now = Date.now();
  const currentDay = getDayKey();

  if (!userRateLimit.has(userId)) {
    userRateLimit.set(userId, {
      minuteWindowStart: now,
      minuteCount: 0,
      dayKey: currentDay,
      dayCount: 0,
      lastSeen: now,
    });
  }

  const record = userRateLimit.get(userId);
  record.lastSeen = now;

  if (record.dayKey !== currentDay) {
    record.dayKey = currentDay;
    record.dayCount = 0;
  }

  if (now - record.minuteWindowStart >= 60 * 1000) {
    record.minuteWindowStart = now;
    record.minuteCount = 0;
  }

  if (record.minuteCount >= MAX_REQUESTS_PER_MINUTE) {
    return { allowed: false, type: 'minute' };
  }

  if (record.dayCount >= MAX_REQUESTS_PER_DAY) {
    return { allowed: false, type: 'day' };
  }

  record.minuteCount += 1;
  record.dayCount += 1;

  return { allowed: true };
};

// POST /api/ai/chat
const chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const userId = req.user?._id?.toString() || 'anonymous';

    cleanupOldRateLimits();

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

    const rateLimitResult = checkAndUpdateRateLimit(userId);
    if (!rateLimitResult.allowed) {
      const rateLimitMessage = rateLimitResult.type === 'minute'
        ? 'وصلت الحد الأقصى للطلبات في الدقيقة. حاول بعد دقيقة.'
        : 'وصلت الحد الأقصى اليومي لاستخدام المساعد.';

      return res.status(429).json({
        success: false,
        message: rateLimitMessage,
      });
    }

    const globalRateLimitResult = checkAndUpdateGlobalRateLimit();
    if (!globalRateLimitResult.allowed) {
      const globalRateLimitMessage = globalRateLimitResult.type === 'minute'
        ? 'الخدمة وصلت الحد الأقصى العام للطلبات في الدقيقة. حاول بعد دقيقة.'
        : 'الخدمة وصلت الحد الأقصى اليومي العام.';

      return res.status(429).json({
        success: false,
        message: globalRateLimitMessage,
      });
    }

    // Trim history to last 6 messages to reduce token usage
    const trimmedHistory = history.slice(-4);

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
              { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
              { role: 'model', parts: [{ text: 'فهمت. سأساعدك في كل ما يخص البرمجة والمشاريع التقنية.' }] },
              ...chatHistory,
            ],
          });

          const result = await chatSession.sendMessage(message);
          const text = result.response.text();

          console.log(`✅ AI response via ${modelName} (attempt ${attempt + 1})`);
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

module.exports = { chat };
