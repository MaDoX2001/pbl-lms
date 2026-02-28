const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Fallback models in order - if one is rate-limited, try the next
const MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash',
  'gemini-1.0-pro',
];

const SYSTEM_PROMPT = `أنت مساعد ذكاء اصطناعي متخصص في منصة التعلم بالمشاريع (PBL). 
تساعد الطلاب في:
- برمجة Arduino وأكواد C++
- مشاريع الإلكترونيات والروبوتات
- فهم المفاهيم البرمجية
- حل الأخطاء البرمجية
- تحسين الكود وشرحه

أجب بشكل واضح ومختصر. إذا كان السؤال بالعربي أجب بالعربي، وإذا كان بالإنجليزي أجب بالإنجليزي.`;

// POST /api/ai/chat
const chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const chatHistory = history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    let lastError = null;

    // Try each model in order until one works
    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });

        const chatSession = model.startChat({
          history: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            { role: 'model', parts: [{ text: 'فهمت. سأساعدك في كل ما يخص البرمجة والمشاريع التقنية.' }] },
            ...chatHistory,
          ],
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.7,
          },
        });

        const result = await chatSession.sendMessage(message);
        const text = result.response.text();

        console.log(`✅ AI response via ${modelName}`);
        return res.json({ success: true, data: { reply: text, model: modelName } });

      } catch (err) {
        lastError = err;
        // Only continue to next model if rate-limited (429) or model not found (404)
        if (err.status === 429 || err.status === 404) {
          console.warn(`⚠️ Model ${modelName} unavailable (${err.status}), trying next...`);
          continue;
        }
        // For other errors, fail immediately
        throw err;
      }
    }

    // All models exhausted
    console.error('All Gemini models rate-limited:', lastError?.message);
    return res.status(429).json({
      success: false,
      message: 'الخدمة مشغولة حالياً، حاول بعد دقيقة.',
    });

  } catch (error) {
    console.error('Gemini AI error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'AI service error',
    });
  }
};

module.exports = { chat };
