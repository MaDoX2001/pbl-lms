const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use gemini-1.5-flash - confirmed free tier available
const MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

const SYSTEM_PROMPT = `أنت مساعد ذكاء اصطناعي متخصص في منصة التعلم بالمشاريع (PBL). 
تساعد الطلاب في:
- برمجة Arduino وأكواد C++
- مشاريع الإلكترونيات والروبوتات
- فهم المفاهيم البرمجية
- حل الأخطاء البرمجية
- تحسين الكود وشرحه

أجب بشكل واضح ومختصر. إذا كان السؤال بالعربي أجب بالعربي، وإذا كان بالإنجليزي أجب بالإنجليزي.`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// POST /api/ai/chat
const chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Trim history to last 6 messages to reduce token usage
    const trimmedHistory = history.slice(-6);

    const chatHistory = trimmedHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    let lastError = null;

    for (let i = 0; i < MODELS.length; i++) {
      const modelName = MODELS[i];
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            maxOutputTokens: 1024, // keep low to save quota
            temperature: 0.7,
          },
        });

        const chatSession = model.startChat({
          history: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            { role: 'model', parts: [{ text: 'فهمت. سأساعدك في كل ما يخص البرمجة والمشاريع التقنية.' }] },
            ...chatHistory,
          ],
        });

        const result = await chatSession.sendMessage(message);
        const text = result.response.text();

        console.log(`✅ AI response via ${modelName}`);
        return res.json({ success: true, data: { reply: text, model: modelName } });

      } catch (err) {
        lastError = err;
        if (err.status === 429 || err.status === 404) {
          console.warn(`⚠️ ${modelName} unavailable (${err.status}), trying next...`);
          // Wait longer before trying next model to avoid burst rate limit
          if (i < MODELS.length - 1) await sleep(2000);
          continue;
        }
        throw err;
      }
    }

    // All models exhausted
    console.error('All models rate-limited');
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
