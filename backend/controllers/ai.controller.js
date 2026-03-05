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
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 1400);

// Detect if a message contains Arduino code patterns
const ARDUINO_CODE_PATTERNS = [
  /void\s+setup\s*\(/,
  /void\s+loop\s*\(/,
  /pinMode\s*\(/,
  /digitalWrite\s*\(/,
  /digitalRead\s*\(/,
  /Serial\.begin\s*\(/,
  /#include\s*[<"]/,
  /analogRead\s*\(/,
  /analogWrite\s*\(/,
  /delay\s*\(\d/,
];

const containsArduinoCode = (text) =>
  ARDUINO_CODE_PATTERNS.some((pattern) => pattern.test(text));

// Wrap raw Arduino code in a structured message for better AI analysis
const wrapArduinoCode = (message) => {
  // If the message is already wrapped (has ``` markers), don't double-wrap
  if (message.includes('```')) return message;
  return `The student sent Arduino code. Analyze it carefully.\n\n\`\`\`cpp\n${message}\n\`\`\``;
};

const STUDENT_SYSTEM_PROMPT = `You are an AI tutor and project mentor inside a project-based learning (PBL) educational platform for teaching Arduino programming.

Your main goal is to help students learn programming concepts, understand Arduino systems, and successfully complete their projects through guidance, explanation, and debugging support.

ENVIRONMENT CONTEXT
Students in this platform write Arduino C++ code and run it using the Wokwi simulator with an Arduino Uno board.
The learning process is project-based, meaning students are expected to build real systems step by step rather than only reading theory.

YOUR ROLE
You act as:
- Programming Tutor: Explain Arduino programming concepts clearly and simply.
- Code Debugger: When students share code, analyze it, detect errors, explain problems, and suggest fixes.
- Project Mentor: Guide students step-by-step while they build their Arduino projects.
- Learning Guide: Encourage understanding instead of giving instant full solutions.

TEACHING STYLE
- Explain concepts clearly using simple language.
- Break explanations into small logical steps.
- Prefer guidance over giving the full solution immediately.
- Encourage the student to think and experiment.
- Ask short guiding questions when helpful.
- Adapt explanations to beginner-level students unless the student demonstrates higher knowledge.

CODE ANALYSIS RULES
When the student sends Arduino code:
1. Read the code carefully.
2. Identify syntax errors or logical mistakes.
3. Explain what the code is trying to do.
4. Point out the exact problem.
5. Provide a corrected version if needed.
6. Explain why the fix works.
Always format code using proper C++ code blocks.

COMMON ARDUINO MISTAKES TO CHECK
When analyzing code, always check for:
- missing semicolons
- incorrect pinMode syntax
- missing commas in function calls
- incorrect use of digitalWrite or digitalRead
- forgetting Serial.begin() before using Serial.print
- wrong pin numbers
- logic errors in loop()
- misuse of delay()

PROJECT GUIDANCE
When helping with projects:
- Understand what the student is trying to build.
- Determine the current stage of the project.
- Suggest the next logical step.
- Explain why that step is important.
- Provide small code examples if needed.
- Avoid giving a full large project solution unless the student specifically asks for it.

EXPLANATION STRUCTURE
When answering technical questions, prefer this structure:
1. Short explanation
2. Example (if needed)
3. Practical advice or next step

LANGUAGE ADAPTATION
Always respond in the same language used by the student.
If the student writes in Arabic, respond in Arabic.
If the student writes in English, respond in English.

ENCOURAGE LEARNING
Occasionally ask small guiding questions such as:
- What do you think this function does?
- Why do we use pinMode in setup()?
- What do you expect the sensor to return?

LIMITATIONS
Students are working only with: Arduino Uno, Arduino C++, Wokwi simulator.
Avoid suggesting hardware or libraries unrelated to Arduino Uno unless the student explicitly asks.

FORMATTING RULES
- Use code blocks (\`\`\`cpp ... \`\`\`) for all code.
- For plain text: do not use * or # at the start of lines.
- Keep responses concise and practical.

GOAL
Help students: understand Arduino programming, debug their code, complete their projects, and develop problem-solving skills.`;

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
// Returns { context: string, currentProjectContext: string }
const buildUserContext = async (user) => {
  if (!user) return { context: '', currentProjectContext: '' };

  const levelMap = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم', expert: 'خبير' };
  let context = `\n--- بيانات المستخدم ---\nالاسم: ${user.name}\nالدور: ${user.role === 'student' ? 'طالب' : user.role === 'teacher' ? 'معلم' : 'مدير'}\n`;
  let currentProjectContext = '';

  if (user.role === 'student') {
    try {
      const [progressList, levelData, team] = await Promise.all([
        Progress.find({ student: user._id })
          .populate('project', 'title level description shortDescription objectives milestones')
          .lean(),
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

      // --- Detect current active project and build CURRENT PROJECT CONTEXT ---
      const currentProgress =
        active.find(p => p.status === 'in-progress') ||
        active.find(p => p.status === 'submitted') ||
        active.find(p => p.status === 'reviewed') ||
        active[0];

      if (currentProgress?.project) {
        const proj = currentProgress.project;
        const statusLabel = {
          'not-started': 'Not started yet',
          'in-progress': 'Currently in progress',
          'submitted': 'Submitted, awaiting review',
          'reviewed': 'Under review',
        }[currentProgress.status] || currentProgress.status;

        let block = `\n\n--- CURRENT PROJECT CONTEXT ---`;
        block += `\nThe student is currently working on the project: "${proj.title}".`;
        block += `\nProject status: ${statusLabel}.`;

        const desc = proj.shortDescription || proj.description;
        if (desc) {
          block += `\nProject goal: ${desc.slice(0, 300)}${desc.length > 300 ? '...' : ''}`;
        }

        if (proj.objectives?.length > 0) {
          block += `\nLearning objectives: ${proj.objectives.slice(0, 3).join(' | ')}`;
        }

        // Milestones: sort by order field, then split into completed vs pending
        if (proj.milestones?.length > 0) {
          const sortedMilestones = [...proj.milestones].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

          const completedIds = new Set(
            (currentProgress.milestoneProgress || [])
              .filter(m => m.completed)
              .map(m => String(m.milestoneId))
          );

          const completedMilestones = sortedMilestones
            .filter(pm => completedIds.has(String(pm._id)))
            .map(pm => pm.title)
            .filter(Boolean)
            .slice(-3); // keep last 3 completed (most recent progress)

          const pendingMilestones = sortedMilestones
            .filter(pm => !completedIds.has(String(pm._id)))
            .map(pm => pm.title)
            .filter(Boolean)
            .slice(0, 4); // next 4 upcoming milestones

          if (completedMilestones.length > 0) {
            block += `\n\nCompleted milestones:\n${completedMilestones.map(t => `• ${t}`).join('\n')}`;
          } else {
            block += `\n\nCompleted milestones: None yet.`;
          }

          if (pendingMilestones.length > 0) {
            block += `\n\nNext milestones:\n${pendingMilestones.map(t => `• ${t}`).join('\n')}`;
          } else {
            block += `\n\nNext milestones: All milestones completed.`;
          }
        }

        block += `\n\nUse this milestone information to guide the student toward the next pending milestone. Suggest small incremental steps rather than full solutions. Connect explanations to the current project whenever possible.`;
        block += `\n--- END OF PROJECT CONTEXT ---`;

        currentProjectContext = block;
      }

    } catch (err) {
      console.warn('Could not build user context:', err.message);
    }
  }

  context += `--- نهاية البيانات ---\n`;
  return { context, currentProjectContext };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// POST /api/ai/chat
const chat = async (req, res) => {
  try {
    const { message, history = [], summary = '' } = req.body;
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
    const { context: userContext, currentProjectContext } = await buildUserContext(user);

    // Auto-wrap Arduino code in the message for better AI analysis
    const processedMessage = containsArduinoCode(message)
      ? wrapArduinoCode(message)
      : message;

    // --- TOKEN SAFETY GUARD ---
    // Base parts that are never trimmed
    const baseSystemPart = basePrompt
      + (userContext ? `\n${userContext}` : '')
      + currentProjectContext;

    // Estimate tokens: total characters / 4 (standard approximation)
    const TOKEN_SAFE_LIMIT = 6500;
    const estimateTokens = (sumText, histCount) => {
      const histText = history.slice(-histCount).map(m => m.content).join('');
      const sumLen = sumText && sumText.trim() ? sumText.length + 80 : 0;
      return Math.ceil((baseSystemPart.length + sumLen + histText.length + message.length) / 4);
    };

    let workingSummary = summary;
    let workingHistoryCount = 6;

    if (estimateTokens(workingSummary, workingHistoryCount) > TOKEN_SAFE_LIMIT) {
      workingSummary = summary.slice(-800); // Step 1: trim summary to last 800 chars
      console.warn('⚠ Token guard: trimmed summary to 800 chars');
    }
    if (estimateTokens(workingSummary, workingHistoryCount) > TOKEN_SAFE_LIMIT) {
      workingHistoryCount = 4; // Step 2: reduce history to 4 messages
      console.warn('⚠ Token guard: reduced history to 4 messages');
    }
    if (estimateTokens(workingSummary, workingHistoryCount) > TOKEN_SAFE_LIMIT) {
      workingHistoryCount = 2; // Step 3: reduce history to 2 messages
      console.warn('⚠ Token guard: reduced history to 2 messages');
    }

    const finalSummaryContext = workingSummary && workingSummary.trim()
      ? `\n\n--- ملخص المحادثة السابقة ---\n${workingSummary}\n--- نهاية الملخص ---`
      : '';

    const fullSystemPrompt = baseSystemPart + finalSummaryContext;

    const trimmedHistory = history.slice(-workingHistoryCount);
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

          const result = await chatSession.sendMessage(processedMessage);
          const text = result.response.text();

          console.log(`✅ AI response via ${modelName} (attempt ${attempt + 1})`);

          // --- SUGGESTION ENGINE ---
          // Generate 2-3 short follow-up questions in the background (fast, low tokens)
          let suggestions = [];
          try {
            const suggestPrompt = `You are helping a student learning Arduino programming.
The student just asked: "${message.slice(0, 200)}"
The AI replied: "${text.slice(0, 300)}"
${currentProjectContext ? `Student's current project info: ${currentProjectContext.slice(0, 200)}` : ''}

Generate exactly 3 short follow-up questions the student might want to ask next.
Questions must relate to Arduino programming or the student's project.
Return ONLY a valid JSON array of 3 strings. No explanation, no markdown, just the array.
Example: ["How do I wire the sensor?","What does digitalRead return?","Show me an example"]`;

            const suggestModel = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: { maxOutputTokens: 120, temperature: 0.7 },
            });
            const suggestResult = await suggestModel.generateContent(suggestPrompt);
            const suggestText = suggestResult.response.text().trim();
            const match = suggestText.match(/\[[\s\S]*\]/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              if (Array.isArray(parsed)) suggestions = parsed.slice(0, 3).map(String);
            }
          } catch (suggestErr) {
            console.warn('Suggestion generation failed (non-critical):', suggestErr.message);
          }

          // Save messages to DB for admin users only
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

          return res.json({ success: true, data: { reply: text, model: modelName, suggestions } });

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
    res.json({
      success: true,
      data: { messages: record?.messages || [], summary: record?.summary || '' },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/ai/history - admin only (clears messages + summary)
const clearHistory = async (req, res) => {
  try {
    const user = req.user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    await AIChatHistory.findOneAndUpdate(
      { user: user._id },
      { $set: { messages: [], summary: '' } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/ai/summarize - all users
// Accepts { previousSummary, messages } → returns { summary }
const summarize = async (req, res) => {
  try {
    const { previousSummary = '', messages = [] } = req.body;

    if (!messages.length) {
      return res.status(400).json({ success: false, message: 'messages required' });
    }

    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'المستخدم' : 'المساعد'}: ${m.content}`)
      .join('\n');

    const prompt = previousSummary && previousSummary.trim()
      ? `Previous summary:\n${previousSummary}\n\nNew conversation:\n${conversationText}\n\nMerge the previous summary with the new conversation into one concise updated summary (maximum 150 words). Preserve the following if present: the student's current Arduino project name, the specific task or circuit they are working on, any bugs or errors encountered, the student's current progress stage, and key concepts already explained. Omit greetings and filler.`
      : `Summarize the following Arduino tutoring conversation in one concise paragraph (maximum 120 words). Preserve: the student's project or task, any code problems or bugs discussed, the student's progress, and key concepts explained. Omit greetings and filler.\n\n${conversationText}`;

    for (const modelName of AI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 400, temperature: 0.2 },
        });
        const result = await model.generateContent(prompt);
        const newSummary = result.response.text().trim();
        console.log(`✅ Summarized via ${modelName}`);
        return res.json({ success: true, data: { summary: newSummary } });
      } catch (err) {
        if (err.status === 404 || err.status === 429) continue;
        throw err;
      }
    }

    return res.status(429).json({ success: false, message: 'تعذّر إنشاء الملخص حالياً.' });
  } catch (error) {
    console.error('Summarize error:', error.message);
    res.status(500).json({ success: false, message: 'حدثت مشكلة أثناء التلخيص.' });
  }
};

// POST /api/ai/summary/save - saves cumulative summary to DB (admin)
const saveSummary = async (req, res) => {
  try {
    const { summary = '' } = req.body;
    await AIChatHistory.findOneAndUpdate(
      { user: req.user._id },
      { $set: { summary } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { chat, getHistory, clearHistory, summarize, saveSummary };
