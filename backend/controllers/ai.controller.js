const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build chat history for context
    const chatHistory = history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
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

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ success: true, data: { reply: text } });
  } catch (error) {
    console.error('Gemini AI error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'AI service error',
    });
  }
};

module.exports = { chat };
