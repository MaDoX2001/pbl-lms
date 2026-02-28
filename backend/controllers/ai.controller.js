const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODEL = 'gemini-2.0-flash';

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

    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    });

    // Retry up to 3 times with increasing delay for 429
    const MAX_RETRIES = 3;
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

        console.log(`✅ AI response via ${MODEL} (attempt ${attempt + 1})`);
        return res.json({ success: true, data: { reply: text, model: MODEL } });

      } catch (err) {
        if (err.status === 429 && attempt < MAX_RETRIES - 1) {
          const waitTime = (attempt + 1) * 5000; // 5s, 10s
          console.warn(`⚠️ ${MODEL} rate limited, retrying in ${waitTime / 1000}s...`);
          await sleep(waitTime);
          continue;
        }
        throw err;
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
