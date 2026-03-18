const { GoogleGenerativeAI } = require('@google/generative-ai');
const Progress = require('../models/Progress.model');
const StudentLevel = require('../models/StudentLevel.model');
const Team = require('../models/Team.model');
const AIChatHistory = require('../models/AIChatHistory.model');
const Project = require('../models/Project.model');
const FinalEvaluation = require('../models/FinalEvaluation.model');
const User = require('../models/User.model');

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

const MAX_INPUT_CHARS = Number(process.env.AI_MAX_INPUT_CHARS || 12000);
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 3500);

// Lightweight in-memory cache for buildUserContext results.
// Avoids 3 redundant MongoDB round-trips per message;
// naturally expires after USER_CONTEXT_TTL_MS so fresh progress is picked up quickly.
const userContextCache = new Map();
const USER_CONTEXT_TTL_MS = 30_000; // 30 seconds

// Prune stale cache entries every 5 minutes to prevent unbounded memory growth.
// .unref() ensures this timer does not keep the Node process alive on shutdown.
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of userContextCache.entries()) {
    if (val.expiresAt <= now) userContextCache.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

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
- When a question clearly relates to the project, end your answer with a short "Next step in your project:" section (1-2 sentences) based on the next pending milestone from the CURRENT PROJECT CONTEXT block.

EXPLANATION STRUCTURE
When answering technical questions, prefer this structure:
1. Short explanation
2. Example code (if relevant, using a \`\`\`cpp block)
3. Why the code works (brief)
4. Optional: "Next step in your project:" — 1-2 sentences, only when the question clearly relates to the student's current project and pending milestones

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

const ADMIN_SYSTEM_PROMPT = `أنت مساعد تحليلي مدمج داخل منصة التعلم بالمشروعات (PBL LMS).
لديك أدوات يمكنك استدعاؤها مباشرة لجلب البيانات الحية من قاعدة البيانات وتنفيذ إجراءات إدارية.
استخدم هذه الأدوات كلما سُئلت عن بيانات الطلاب أو المشاريع أو الفرق أو التقييمات.

قواعد صارمة:
- استدعِ الأداة المناسبة دائماً بدلاً من قول "لا أملك صلاحيات".
- بعد الحصول على نتيجة الأداة، لخّصها بوضوح ومنظمة.
- أجب بنفس لغة السؤال.
- لا تستخدم * أو # في بداية السطور في النص العادي.
- كن دقيقاً في عرض الأرقام والإحصاءات.`;

const TEACHER_SYSTEM_PROMPT_AGENTIC = `أنت مساعد ذكي للمعلمين داخل منصة التعلم بالمشروعات (PBL LMS).
لديك أدوات يمكنك استدعاؤها لجلب بيانات الطلاب والمشاريع وتنفيذ إجراءات إدارية.

مهامك الأساسية:
1) مساعدة في التقييم: ساعد في كتابة معايير تقييم واضحة، اقترح أسئلة التقييم الشفهي.
2) إدارة المشاريع: اقترح أوصاف مشاريع PBL، اقترح موارد تعليمية.
3) تحليل أداء الطلاب: استخدم الأدوات لجلب البيانات الحقيقية.

قواعد:
- استدعِ الأداة المناسبة بدلاً من قول "لا أملك صلاحيات".
- أجب بنفس لغة السؤال.
- لا تستخدم * أو # في بداية السطور.`;

// ─── Gemini Function (Tool) Declarations ───────────────────────────────────
const AGENT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'list_students',
        description: 'List all students on the platform with their progress and completion summary',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
      },
      {
        name: 'get_student_details',
        description: 'Get detailed information about a specific student including all projects, evaluations, level, and team',
        parameters: {
          type: 'OBJECT',
          properties: {
            student_name: { type: 'STRING', description: 'Full or partial name of the student (Arabic or English)' },
          },
          required: ['student_name'],
        },
      },
      {
        name: 'get_project_stats',
        description: 'Get statistics for a specific project: enrolled count, completion rate, average score, pass/fail',
        parameters: {
          type: 'OBJECT',
          properties: {
            project_title: { type: 'STRING', description: 'Full or partial title of the project' },
          },
          required: ['project_title'],
        },
      },
      {
        name: 'list_teams',
        description: 'List all teams with their members and roles',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
      },
      {
        name: 'get_struggling_students',
        description: 'Identify students who are failing evaluations, behind on projects, or have not started',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
      },
      {
        name: 'grant_retake',
        description: 'Grant a student permission to retake a failed evaluation for a specific project',
        parameters: {
          type: 'OBJECT',
          properties: {
            student_name: { type: 'STRING', description: 'Full or partial name of the student' },
            project_title: { type: 'STRING', description: 'Full or partial title of the project' },
          },
          required: ['student_name', 'project_title'],
        },
      },
      {
        name: 'get_platform_overview',
        description: 'Get a high-level overview of the platform: total students, projects, teams, progress stats',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
      },
    ],
  },
];

// ─── Execute Agent Function ─────────────────────────────────────────────────
const executeAgentFunction = async (name, args = {}) => {
  try {
    switch (name) {
      case 'list_students': {
        const students = await User.find({ role: 'student' }, 'name email createdAt').lean();
        const progressList = await Progress.find({})
          .populate('student', 'name').populate('project', 'title').lean();
        const result = students.map(s => {
          const records = progressList.filter(p => p.student?._id?.toString() === s._id.toString());
          return {
            name: s.name,
            email: s.email,
            projects_active: records.filter(p => p.status === 'in-progress').length,
            projects_completed: records.filter(p => p.status === 'completed').length,
            projects_submitted: records.filter(p => p.status === 'submitted').length,
          };
        });
        return { success: true, total: result.length, students: result };
      }

      case 'get_student_details': {
        const { student_name } = args;
        const student = await User.findOne({
          role: 'student',
          name: { $regex: student_name, $options: 'i' },
        }).lean();
        if (!student) return { success: false, error: `لم يتم العثور على طالب باسم "${student_name}"` };

        const [progress, evaluations, levelDoc, team] = await Promise.all([
          Progress.find({ student: student._id }).populate('project', 'title level').lean(),
          FinalEvaluation.find({ student: student._id }).populate('project', 'title').lean(),
          StudentLevel.findOne({ student: student._id }).lean(),
          Team.findOne({ 'members.user': student._id }).lean(),
        ]);

        return {
          success: true,
          student: {
            name: student.name,
            email: student.email,
            level: levelDoc?.currentLevel || 'beginner',
            team: team?.name || null,
            projects: progress.map(p => ({
              title: p.project?.title,
              status: p.status,
              started: p.startedAt,
            })),
            evaluations: evaluations.map(e => ({
              project: e.project?.title,
              score: e.totalPercentage !== undefined ? `${Math.round(e.totalPercentage)}%` : null,
              passed: e.passed,
            })),
          },
        };
      }

      case 'get_project_stats': {
        const { project_title } = args;
        const project = await Project.findOne({ title: { $regex: project_title, $options: 'i' } }).lean();
        if (!project) return { success: false, error: `لم يتم العثور على مشروع بعنوان "${project_title}"` };

        const [progress, evaluations] = await Promise.all([
          Progress.find({ project: project._id }).populate('student', 'name').lean(),
          FinalEvaluation.find({ project: project._id }).populate('student', 'name').lean(),
        ]);

        const avgScore = evaluations.length > 0
          ? Math.round(evaluations.reduce((s, e) => s + (e.totalPercentage || 0), 0) / evaluations.length)
          : null;

        return {
          success: true,
          project: {
            title: project.title,
            level: project.level,
            enrolled: progress.length,
            completed: progress.filter(p => p.status === 'completed').length,
            submitted: progress.filter(p => ['submitted', 'reviewed'].includes(p.status)).length,
            evaluations_count: evaluations.length,
            passed: evaluations.filter(e => e.passed).length,
            failed: evaluations.filter(e => !e.passed).length,
            avg_score: avgScore,
            students: progress.map(p => ({ name: p.student?.name, status: p.status })),
          },
        };
      }

      case 'list_teams': {
        const teams = await Team.find({}).populate('members.user', 'name').lean();
        return {
          success: true,
          total: teams.length,
          teams: teams.map(t => ({
            name: t.name,
            members: t.members.map(m => ({ name: m.user?.name, role: m.role })),
          })),
        };
      }

      case 'get_struggling_students': {
        const [allStudents, allProgress, allEvals] = await Promise.all([
          User.find({ role: 'student' }, 'name email').lean(),
          Progress.find({}).populate('student', 'name').populate('project', 'title').lean(),
          FinalEvaluation.find({}).populate('student', 'name').populate('project', 'title').lean(),
        ]);

        const struggling = [];
        allStudents.forEach(s => {
          const records = allProgress.filter(p => p.student?._id?.toString() === s._id.toString());
          const evals = allEvals.filter(e => e.student?._id?.toString() === s._id.toString());
          const failedEvals = evals.filter(e => !e.passed);
          const notStarted = records.filter(p => p.status === 'not-started').length;
          if (failedEvals.length > 0 || notStarted >= 2) {
            struggling.push({
              name: s.name,
              failed_projects: failedEvals.map(e => e.project?.title).filter(Boolean),
              not_started_count: notStarted,
            });
          }
        });

        return { success: true, count: struggling.length, struggling_students: struggling };
      }

      case 'grant_retake': {
        const { student_name, project_title } = args;
        const [student, project] = await Promise.all([
          User.findOne({ role: 'student', name: { $regex: student_name, $options: 'i' } }).lean(),
          Project.findOne({ title: { $regex: project_title, $options: 'i' } }).lean(),
        ]);
        if (!student) return { success: false, error: `لم يتم العثور على طالب باسم "${student_name}"` };
        if (!project) return { success: false, error: `لم يتم العثور على مشروع بعنوان "${project_title}"` };

        const updated = await FinalEvaluation.findOneAndUpdate(
          { student: student._id, project: project._id },
          { retakeAllowed: true },
          { new: true }
        );
        if (!updated) return { success: false, error: `لا يوجد تقييم للطالب "${student.name}" في مشروع "${project.title}"` };

        return { success: true, action: 'grant_retake', student: student.name, project: project.title, message: `تم منح ${student.name} إذن إعادة التقييم في "${project.title}" بنجاح` };
      }

      case 'get_platform_overview': {
        const [users, projects, teams, progress] = await Promise.all([
          User.find({}, 'role').lean(),
          Project.find({}, 'title level isPublished').lean(),
          Team.countDocuments(),
          Progress.find({}).lean(),
        ]);
        const students = users.filter(u => u.role === 'student').length;
        const teachers = users.filter(u => u.role === 'teacher').length;
        const completed = progress.filter(p => p.status === 'completed').length;
        const inProgress = progress.filter(p => p.status === 'in-progress').length;
        return {
          success: true,
          overview: {
            total_students: students,
            total_teachers: teachers,
            total_projects: projects.length,
            published_projects: projects.filter(p => p.isPublished).length,
            total_teams: teams,
            progress_completed: completed,
            progress_in_progress: inProgress,
          },
        };
      }

      default:
        return { success: false, error: `Unknown function: ${name}` };
    }
  } catch (err) {
    console.error(`[executeAgentFunction] ${name} error:`, err.message);
    return { success: false, error: err.message };
  }
};

// Build dynamic context from user's real data
// Returns { context: string, currentProjectContext: string, projectProgress: object|null }
const buildUserContext = async (user) => {
  if (!user) return { context: '', currentProjectContext: '' };

  // Cache hit: return early if data is still fresh
  const cacheKey = user._id.toString();
  const cached = userContextCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const levelMap = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم', expert: 'خبير' };
  let context = `\n--- بيانات المستخدم ---\nالاسم: ${user.name}\nالدور: ${user.role === 'student' ? 'طالب' : user.role === 'teacher' ? 'معلم' : 'مدير'}\n`;
  let currentProjectContext = '';
  let projectProgress = null;

  if (user.role === 'student') {
    try {
      const [progressList, levelData, team] = await Promise.all([
        Progress.find({ student: user._id })
          .populate('project', 'title level description shortDescription objectives milestones')
          .lean(),
        StudentLevel.findOne({ student: user._id }).lean(),
        Team.findOne({ 'members.user': user._id }).populate('members.user', 'name').lean(),
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
        const memberNames = team.members.map(m => m.user?.name).filter(Boolean).join('، ');
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

          projectProgress = {
            projectTitle: proj.title,
            status: currentProgress.status,
            completedMilestones,
            pendingMilestones,
            nextMilestone: pendingMilestones[0] || null,
          };

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

  // Teacher: students, teams, projects, and recent evaluations
  if (user.role === 'teacher') {
    try {
      const [allStudents, allProjects, allTeams, allProgress, recentEvals] = await Promise.all([
        User.find({ role: 'student' }, 'name email createdAt isActive').sort({ createdAt: -1 }).lean(),
        Project.find({}, 'title level description isPublished').sort({ createdAt: 1 }).limit(20).lean(),
        Team.find({}).populate('members.user', 'name email').lean(),
        Progress.find({}).populate('student', 'name email').populate('project', 'title').lean(),
        FinalEvaluation.find({}).sort({ createdAt: -1 }).limit(30)
          .populate('student', 'name').populate('project', 'title').lean(),
      ]);

      context += `\n=== بيانات المنصة للمعلم ===\n`;
      context += `إجمالي الطلاب: ${allStudents.length} | إجمالي المشاريع: ${allProjects.length}\n`;

      context += `\n--- قائمة الطلاب ---\n`;
      allStudents.forEach(s => {
        const progRecords = allProgress.filter(p => p.student?._id?.toString() === s._id.toString());
        const completed = progRecords.filter(p => p.status === 'completed').length;
        const active = progRecords.filter(p => p.status === 'in-progress').length;
        context += `الطالب: ${s.name} (${s.email}) | مشاريع مكتملة: ${completed}، نشطة: ${active}\n`;
      });

      context += `\n--- المشاريع والإحصاءات ---\n`;
      allProjects.forEach(proj => {
        const projProgress = allProgress.filter(p => p.project?._id?.toString() === proj._id.toString());
        const enrolled = projProgress.length;
        const completed = projProgress.filter(p => p.status === 'completed').length;
        const evalRecords = recentEvals.filter(e => e.project?._id?.toString() === proj._id.toString());
        const avgScore = evalRecords.length > 0
          ? Math.round(evalRecords.reduce((s, e) => s + (e.totalPercentage || 0), 0) / evalRecords.length)
          : null;
        context += `المشروع: ${proj.title} (${proj.level || 'غير محدد'}) | ملتحقون: ${enrolled}، مكتملون: ${completed}${avgScore !== null ? `، متوسط الدرجات: ${avgScore}%` : ''}\n`;
      });

      if (allTeams.length > 0) {
        context += `\n--- الفرق ---\n`;
        allTeams.forEach(team => {
          const memberNames = team.members.map(m => m.user?.name).filter(Boolean).join('، ');
          context += `الفريق: ${team.name} | المشروع: ${team.project?.title || 'غير محدد'} | الأعضاء: ${memberNames || 'لا يوجد'}\n`;
        });
      }

      if (recentEvals.length > 0) {
        context += `\n--- آخر التقييمات ---\n`;
        recentEvals.forEach(e => {
          const grade = e.totalPercentage !== undefined ? `${Math.round(e.totalPercentage)}%` : 'غير محدد';
          const passed = e.passed ? 'ناجح' : 'راسب';
          context += `${e.student?.name || 'طالب'} | ${e.project?.title || 'مشروع'} | ${grade} | ${passed}\n`;
        });
      }
    } catch (err) {
      console.warn('Could not build teacher context:', err.message);
    }
  }

  // Admin: full DB snapshot
  if (user.role === 'admin') {
    try {
      const [allUsers, allProjects, allTeams, allProgress, recentEvals] = await Promise.all([
        User.find({}, 'name email role createdAt isActive').sort({ createdAt: -1 }).lean(),
        Project.find({}, 'title level description isPublished createdAt').sort({ createdAt: 1 }).lean(),
        Team.find({}).populate('members.user', 'name email').lean(),
        Progress.find({}).populate('student', 'name email').populate('project', 'title').lean(),
        FinalEvaluation.find({}).sort({ createdAt: -1 }).limit(30)
          .populate('student', 'name').populate('project', 'title').lean(),
      ]);

      const students = allUsers.filter(u => u.role === 'student');
      const teachers = allUsers.filter(u => u.role === 'teacher');

      context += `\n=== إحصاءات المنصة ===\n`;
      context += `إجمالي الطلاب: ${students.length} | إجمالي المعلمين: ${teachers.length} | إجمالي المشاريع: ${allProjects.length}\n`;

      // Students list
      context += `\n--- قائمة الطلاب ---\n`;
      students.forEach(s => {
        const progRecords = allProgress.filter(p => p.student?._id?.toString() === s._id.toString());
        const completed = progRecords.filter(p => p.status === 'completed').length;
        const active = progRecords.filter(p => p.status === 'in-progress').length;
        context += `الطالب: ${s.name} (${s.email}) | مشاريع مكتملة: ${completed}، نشطة: ${active}\n`;
      });

      // Projects with stats
      context += `\n--- المشاريع والإحصاءات ---\n`;
      allProjects.forEach(proj => {
        const projProgress = allProgress.filter(p => p.project?._id?.toString() === proj._id.toString());
        const enrolled = projProgress.length;
        const completed = projProgress.filter(p => p.status === 'completed').length;
        const evalRecords = recentEvals.filter(e => e.project?._id?.toString() === proj._id.toString() || e.project?.title === proj.title);
        const avgScore = evalRecords.length > 0
          ? Math.round(evalRecords.reduce((s, e) => s + (e.totalPercentage || 0), 0) / evalRecords.length)
          : null;
        context += `المشروع: ${proj.title} (${proj.level || 'غير محدد'}) | ملتحقون: ${enrolled}، مكتملون: ${completed}${avgScore !== null ? `، متوسط الدرجات: ${avgScore}%` : ''}\n`;
      });

      // Teams
      if (allTeams.length > 0) {
        context += `\n--- الفرق ---\n`;
        allTeams.forEach(team => {
          const memberNames = team.members.map(m => m.user?.name).filter(Boolean).join('، ');
          context += `الفريق: ${team.name} | المشروع: ${team.project?.title || 'غير محدد'} | الأعضاء: ${memberNames || 'لا يوجد'}\n`;
        });
      }

      // Recent evaluations
      if (recentEvals.length > 0) {
        context += `\n--- آخر التقييمات ---\n`;
        recentEvals.forEach(e => {
          const grade = e.totalPercentage !== undefined ? `${Math.round(e.totalPercentage)}%` : 'غير محدد';
          const passed = e.passed ? 'ناجح' : 'راسب';
          context += `${e.student?.name || 'طالب'} | ${e.project?.title || 'مشروع'} | ${grade} | ${passed}\n`;
        });
      }

    } catch (err) {
      console.warn('Could not build admin context:', err.message);
    }
  }

  context += `--- نهاية البيانات ---\n`;
  const result = { context, currentProjectContext, projectProgress };
  console.log(`[buildUserContext] role=${user.role} contextLen=${context.length}`);

  // Cache for 5 min for all roles
  const ttl = 5 * 60_000;
  userContextCache.set(cacheKey, { data: result, expiresAt: Date.now() + ttl });

  return result;
};

// Parallel suggestion generator — fires independently from the main AI call
// Uses only user message + project context (no AI reply needed) so it can run upfront
const generateSuggestions = async (message, projectContext, userRole = 'student') => {
  const isTeacherRole = userRole === 'teacher' || userRole === 'admin';
  const isArabic = /[\u0600-\u06FF]/.test(message);
  let suggestPrompt;
  if (isTeacherRole) {
    suggestPrompt = isArabic
      ? `معلم يستخدم منصة PBL LMS قال: "${message.slice(0, 200)}"

اقترح 3 أسئلة متابعة قصيرة قد يريد المعلم طرحها.
يجب أن ترتبط بتصميم المشاريع أو تقييم الطلاب أو استراتيجية التدريس.
أعد فقط مصفوفة JSON من 3 نصوص. بدون شرح أو markdown.
مثال: ["كيف أكتب معايير تقييم عادلة؟","ما أسئلة التقييم الشفهي الجيدة؟","كيف أساعد طالبًا متعثرًا؟"]`
      : `A teacher using a PBL LMS platform just said: "${message.slice(0, 200)}"

Generate exactly 3 short follow-up questions the teacher might want to ask next.
Questions should relate to project design, student evaluation, or teaching strategy.
Return ONLY a valid JSON array of 3 strings. No explanation, no markdown, just the array.
Example: ["How do I write fair grading rubrics?","What are good oral assessment questions?","How to help a struggling student?"]`;
  } else {
    suggestPrompt = isArabic
      ? `طالب يتعلم برمجة Arduino سأل: "${message.slice(0, 200)}"
${projectContext ? `سياق مشروعه الحالي:\n${projectContext.slice(0, 300)}` : ''}

اقترح 3 أسئلة متابعة قصيرة قد يريد الطالب سؤالها.
يجب أن ترتبط ببرمجة Arduino أو مشروع الطالب.
أعد فقط مصفوفة JSON من 3 نصوص. بدون شرح أو markdown.
مثال: ["كيف أوصّل الحساس؟","ماذا يُرجع digitalRead؟","ماذا أفعل بعد ذلك؟"]`
      : `A student learning Arduino programming just asked: "${message.slice(0, 200)}"
${projectContext ? `Student's current project context:\n${projectContext.slice(0, 300)}` : ''}

Generate exactly 3 short follow-up questions the student might want to ask next.
Questions must relate to Arduino programming or the student's project.
Return ONLY a valid JSON array of 3 strings. No explanation, no markdown, just the array.
Example: ["How do I wire the sensor?","What does digitalRead return?","What should I do next?"]`;
  }

  for (const modelName of AI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { maxOutputTokens: 120, temperature: 0.7 },
      });
      const result = await model.generateContent(suggestPrompt);
      const raw = result.response.text().trim();
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) return parsed.slice(0, 3).map(String);
      }
      return [];
    } catch (err) {
      if (err.status === 404 || err.status === 429) continue;
      return []; // silent fail — never blocks main response
    }
  }
  return [];
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// POST /api/ai/chat
const chat = async (req, res) => {
  try {
    const { message, history = [], summary = '' } = req.body;
    const user = req.user;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, message: 'مفتاح خدمة الذكاء الاصطناعي غير مضبوط.' });
    }
    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    if (message.length > MAX_INPUT_CHARS) {
      return res.status(400).json({ success: false, message: `الرسالة طويلة جدًا. الحد الأقصى ${MAX_INPUT_CHARS} حرف.` });
    }

    const isAgentRole = user?.role === 'admin' || user?.role === 'teacher';
    const basePrompt = user?.role === 'admin'
      ? ADMIN_SYSTEM_PROMPT
      : (user?.role === 'teacher' ? TEACHER_SYSTEM_PROMPT_AGENTIC : STUDENT_SYSTEM_PROMPT);

    const { context: userContext, currentProjectContext, projectProgress } = await buildUserContext(user);

    const processedMessage = containsArduinoCode(message) ? wrapArduinoCode(message) : message;

    const baseSystemPart = basePrompt + (userContext ? `\n${userContext}` : '') + currentProjectContext;
    const TOKEN_SAFE_LIMIT = user?.role === 'admin' ? 10000 : 6500;
    const estimateTokens = (sumText, histCount) => {
      const histText = history.slice(-histCount).map(m => m.content).join('');
      const totalText = baseSystemPart + (sumText || '') + histText + message;
      const arabicChars = (totalText.match(/[\u0600-\u06FF]/g) || []).length;
      const latinChars = totalText.length - arabicChars;
      return Math.ceil(arabicChars / 2.5 + latinChars / 4);
    };

    let workingSummary = summary;
    let workingHistoryCount = 6;
    let guardTriggered = false;
    if (estimateTokens(workingSummary, workingHistoryCount) > TOKEN_SAFE_LIMIT) { workingSummary = summary.slice(-800); guardTriggered = true; }
    if (estimateTokens(workingSummary, workingHistoryCount) > TOKEN_SAFE_LIMIT) { workingHistoryCount = 4; guardTriggered = true; }
    if (estimateTokens(workingSummary, workingHistoryCount) > TOKEN_SAFE_LIMIT) { workingHistoryCount = 2; guardTriggered = true; }

    const finalSummaryContext = workingSummary?.trim()
      ? `\n\n--- ملخص المحادثة السابقة ---\n${workingSummary}\n--- نهاية الملخص ---` : '';
    const fullSystemPrompt = baseSystemPart + finalSummaryContext;

    const trimmedHistory = history.slice(-workingHistoryCount);
    const chatHistory = trimmedHistory.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const suggestionPromise = generateSuggestions(message, currentProjectContext, user?.role).catch(() => []);

    for (let modelIndex = 0; modelIndex < AI_MODELS.length; modelIndex++) {
      const modelName = AI_MODELS[modelIndex];
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: fullSystemPrompt,
        ...(isAgentRole ? { tools: AGENT_TOOLS } : {}),
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.4 },
      });

      const MAX_RETRIES = 2;
      let totalWaitMs = 0;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const chatSession = model.startChat({ history: chatHistory });
          const result = await chatSession.sendMessage(processedMessage);

          let fullText = result.response.text();
          let agentActionResult = null;

          // ── Function-calling (agentic) path ────────────────────────────
          if (isAgentRole) {
            const functionCalls = result.response.functionCalls?.() || [];
            if (functionCalls.length > 0) {
              const fc = functionCalls[0];
              console.log(`[Agent] calling ${fc.name} with`, fc.args);
              const fnResult = await executeAgentFunction(fc.name, fc.args);
              agentActionResult = { name: fc.name, args: fc.args, result: fnResult };

              const finalTurn = await chatSession.sendMessage([{
                functionResponse: { name: fc.name, response: fnResult },
              }]);
              fullText = finalTurn.response.text();
            }
          }
          // ───────────────────────────────────────────────────────────────

          console.log(`✅ AI response via ${modelName} (attempt ${attempt + 1})`);
          const suggestions = await suggestionPromise;

          try {
            await AIChatHistory.findOneAndUpdate(
              { user: user._id },
              { $push: { messages: { $each: [{ role: 'user', content: message }, { role: 'assistant', content: fullText }], $slice: -20 } } },
              { upsert: true, new: true }
            );
          } catch (saveErr) {
            console.warn('Could not save chat history:', saveErr.message);
          }

          return res.json({
            success: true,
            text: fullText,
            suggestions,
            projectProgress: user?.role === 'student' ? projectProgress : null,
            guardTriggered,
            agentAction: agentActionResult || undefined,
            model: modelName,
          });

        } catch (err) {
          const isRetriable429 = err.status === 429 && attempt < MAX_RETRIES - 1;
          if (isRetriable429) {
            const waitTime = (attempt + 1) * 3000;
            if (totalWaitMs + waitTime > 9000) throw err;
            totalWaitMs += waitTime;
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

    return res.status(429).json({ success: false, message: 'الخدمة مشغولة حالياً، حاول بعد دقيقة.' });

  } catch (error) {
    console.error('Gemini AI error:', error.message);
    const errCode = error.status === 429 ? 'MODEL_RATE_LIMIT' : error.status === 404 ? 'MODEL_UNAVAILABLE' : 'UNKNOWN_ERROR';
    return res.status(error.status === 429 ? 429 : 500).json({
      success: false,
      code: errCode,
      message: error.status === 429
        ? 'خدمة الذكاء الاصطناعي مزدحمة حالياً، حاول بعد دقيقة.'
        : 'حدثت مشكلة في الخدمة، حاول مرة أخرى.',
    });
  }
};

// GET /api/ai/history - all authenticated roles
const getHistory = async (req, res) => {
  try {
    const record = await AIChatHistory.findOne({ user: req.user._id }).lean();
    res.json({
      success: true,
      data: { messages: record?.messages || [], summary: record?.summary || '' },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/ai/history - all authenticated roles (clears messages + summary)
const clearHistory = async (req, res) => {
  try {
    await AIChatHistory.findOneAndUpdate(
      { user: req.user._id },
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

    // Guard: cap message count and total text size to prevent oversized summarization prompts
    const MAX_SUMMARIZE_MESSAGES = Number(process.env.AI_MAX_SUMMARIZE_MESSAGES || 40);
    const MAX_SUMMARIZE_CHARS = Number(process.env.AI_MAX_SUMMARIZE_CHARS || 20000);
    const cappedMessages = messages.slice(-MAX_SUMMARIZE_MESSAGES);
    const rawText = cappedMessages.map(m => m.content || '').join('');
    if (rawText.length > MAX_SUMMARIZE_CHARS) {
      return res.status(400).json({ success: false, message: 'محتوى الرسائل كبير جداً للتلخيص.' });
    }

    const isTeacher = req.user?.role === 'teacher' || req.user?.role === 'admin';
    const userLabel = isTeacher ? 'Teacher' : 'المستخدم';
    const assistantLabel = isTeacher ? 'Assistant' : 'المساعد';
    const conversationText = cappedMessages
      .map((m) => `${m.role === 'user' ? userLabel : assistantLabel}: ${m.content}`)
      .join('\n');
    const prompt = isTeacher
      ? (previousSummary && previousSummary.trim()
          ? `Previous summary:\n${previousSummary}\n\nNew conversation:\n${conversationText}\n\nMerge the previous summary with the new conversation into one concise updated summary (maximum 150 words). Preserve: discussed evaluation criteria, project design decisions, student progress observations, and teaching strategies mentioned. Omit greetings and filler.`
          : `Summarize the following conversation between a teacher and an AI assistant about course design, student evaluation, or project supervision.\n\nPreserve:\n- discussed evaluation criteria\n- project design decisions\n- student progress observations\n- teaching strategies\n\nLimit: 120 words. Omit greetings and filler.\n\n${conversationText}`)
      : (previousSummary && previousSummary.trim()
          ? `Previous summary:\n${previousSummary}\n\nNew conversation:\n${conversationText}\n\nMerge the previous summary with the new conversation into one concise updated summary (maximum 150 words). Preserve: the student's current Arduino project name, the specific task or circuit they are working on, any bugs or errors encountered, the student's current progress stage, and a brief list of concepts already explained to the student (so the AI can avoid re-explaining them and build progressively). Omit greetings and filler.`
          : `Summarize the following Arduino tutoring conversation in one concise paragraph (maximum 120 words). Preserve: the student's project or task, any code problems or bugs discussed, the student's progress, and a brief list of concepts already explained to the student. Omit greetings and filler.\n\n${conversationText}`);

    for (const modelName of AI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 400, temperature: 0.2 },
        });
        const result = await model.generateContent(prompt);
        const newSummary = result.response.text().trim();
        // Quality guard: if summary too short, keep previous to avoid losing context
        const finalSummary = newSummary.length >= 30 ? newSummary : (previousSummary || newSummary);
        console.log(`✅ Summarized via ${modelName}${newSummary.length < 30 ? ' (kept previous — new was too short)' : ''}`);
        return res.json({ success: true, data: { summary: finalSummary } });
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

// POST /api/ai/summary/save - saves cumulative summary to DB (all authenticated roles)
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

// GET /api/ai/summary - returns only the summary for any authenticated user
// Used by students/teachers on mount to restore conversation context across sessions
const getSummary = async (req, res) => {
  try {
    const record = await AIChatHistory.findOne({ user: req.user._id }, 'summary').lean();
    res.json({ success: true, data: { summary: record?.summary || '' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/ai/teacher-analytics - generates AI analytics report for a project
const teacherAnalytics = async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'projectId مطلوب.' });
    }

    const [project, progressList, finalEvals] = await Promise.all([
      Project.findById(projectId, 'title level description milestones').lean(),
      Progress.find({ project: projectId })
        .populate('student', 'name')
        .lean(),
      FinalEvaluation.find({ project: projectId }).lean(),
    ]);

    if (!project) {
      return res.status(404).json({ success: false, message: 'المشروع غير موجود.' });
    }

    const evalMap = {};
    finalEvals.forEach(e => { evalMap[String(e.student)] = e; });

    const studentSummaries = progressList.map(p => {
      const evalData = evalMap[String(p.student?._id || p.student)];
      const completedMilestones = (p.milestoneProgress || []).filter(m => m.completed).length;
      const totalMilestones = project.milestones?.length || 0;
      return `- ${p.student?.name || 'طالب'}: الحالة=${p.status}, المراحل المنجزة=${completedMilestones}/${totalMilestones}${evalData ? `, التقييم النهائي=${evalData.finalPercentage?.toFixed(1)}% (${evalData.status === 'passed' ? 'ناجح' : 'راسب'})` : ', لم يُقيَّم بعد'}`;
    });

    const prompt = `أنت محلل تعليمي خبير. فيما يلي بيانات تقدم الطلاب في مشروع "${project.title}" (المستوى: ${project.level || 'غير محدد'}).

بيانات الطلاب:
${studentSummaries.join('\n') || 'لا يوجد طلاب مسجلون.'}

اكتب تقرير تحليلي للمعلم يشمل:
1. ملخص عام لأداء المجموعة (جملتان).
2. نقاط القوة الملاحظة.
3. نقاط الضعف التي تحتاج تدخلاً.
4. قائمة بأسماء الطلاب الذين يحتاجون دعماً إضافياً مع سبب قصير.
5. توصيات عملية للمعلم (3 توصيات).

أسلوب الرد: مهني، منظم، مختصر. لا تستخدم * أو # في بداية الأسطر.`;

    for (const modelName of AI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 800, temperature: 0.4 },
        });
        const result = await model.generateContent(prompt);
        const analysis = result.response.text().trim();
        console.log(`✅ teacherAnalytics via ${modelName}`);
        return res.json({ success: true, data: { analysis, projectTitle: project.title } });
      } catch (err) {
        if (err.status === 404 || err.status === 429) continue;
        throw err;
      }
    }

    return res.status(429).json({ success: false, message: 'تعذّر إنشاء التقرير حالياً، حاول لاحقاً.' });
  } catch (error) {
    console.error('teacherAnalytics error:', error.message);
    res.status(500).json({ success: false, message: 'حدثت مشكلة أثناء إنشاء التقرير.' });
  }
};

// POST /api/ai/remedial - generates remedial activity suggestions for a student
const getRemedialActivities = async (req, res) => {
  try {
    const studentId = String(req.user._id);

    const [progressList, levelData] = await Promise.all([
      Progress.find({ student: studentId })
        .populate('project', 'title level milestones')
        .lean(),
      StudentLevel.findOne({ student: studentId }).lean(),
    ]);

    const levelMap = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم', expert: 'خبير' };
    const currentLevel = levelMap[levelData?.currentLevel] || 'مبتدئ';

    const weakAreas = [];
    progressList.forEach(p => {
      if (!p.project) return;
      const completedIds = new Set(
        (p.milestoneProgress || []).filter(m => m.completed).map(m => String(m.milestoneId))
      );
      const stuck = (p.project.milestones || []).filter(m => !completedIds.has(String(m._id)));
      if (stuck.length > 0) {
        weakAreas.push(`مشروع "${p.project.title}": مراحل لم تُكتمل بعد: ${stuck.map(m => m.title).slice(0, 3).join('، ')}`);
      }
    });

    const prompt = `أنت مرشد تعليمي متخصص في برمجة Arduino. الطالب في مستوى ${currentLevel}.

${weakAreas.length > 0
  ? `المجالات التي يحتاج فيها الطالب دعماً:\n${weakAreas.join('\n')}`
  : 'الطالب يسير بشكل جيد عموماً.'}

اقترح 3 تمارين علاجية مخصصة ومحددة للطالب لتعزيز فهمه:
- كل تمرين يجب أن يكون عملياً وقابلاً للتنفيذ على Wokwi.
- حدد العنوان، الهدف (جملة واحدة)، وخطوتين رئيسيتين.
- الأسلوب: بسيط ومباشر. لا تستخدم * أو # في بداية الأسطر.`;

    for (const modelName of AI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 600, temperature: 0.5 },
        });
        const result = await model.generateContent(prompt);
        const activities = result.response.text().trim();
        console.log(`✅ getRemedialActivities via ${modelName}`);
        return res.json({ success: true, data: { activities, weakAreas } });
      } catch (err) {
        if (err.status === 404 || err.status === 429) continue;
        throw err;
      }
    }

    return res.status(429).json({ success: false, message: 'تعذّر إنشاء الأنشطة العلاجية حالياً.' });
  } catch (error) {
    console.error('getRemedialActivities error:', error.message);
    res.status(500).json({ success: false, message: 'حدثت مشكلة أثناء إنشاء الأنشطة.' });
  }
};

// GET /api/ai/project-ideas - suggests Arduino project ideas based on student level
const getProjectIdeas = async (req, res) => {
  try {
    const [progressList, levelData] = await Promise.all([
      Progress.find({ student: req.user._id })
        .populate('project', 'title')
        .lean(),
      StudentLevel.findOne({ student: req.user._id }).lean(),
    ]);

    const levelMap = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم', expert: 'خبير' };
    const currentLevel = levelMap[levelData?.currentLevel] || 'مبتدئ';
    const completedProjects = progressList
      .filter(p => p.status === 'completed')
      .map(p => p.project?.title)
      .filter(Boolean);

    const prompt = `أنت مرشد تعليمي متخصص في Arduino لطلاب مستوى ${currentLevel}.
${completedProjects.length > 0 ? `الطالب أتم المشاريع التالية: ${completedProjects.join('، ')}.` : 'الطالب مبتدئ ولم يُكمل مشاريع بعد.'}

اقترح 5 أفكار مشاريع Arduino إبداعية ومناسبة لهذا المستوى لم يعملها الطالب بعد.
لكل فكرة:
- العنوان
- الوصف (جملتان)
- المكونات الرئيسية المطلوبة (3-4 مكونات)
- مستوى الصعوبة (سهل / متوسط / صعب)

الأسلوب: مبدع، مشجع، عملي. لا تستخدم * أو # في بداية الأسطر.`;

    for (const modelName of AI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 700, temperature: 0.7 },
        });
        const result = await model.generateContent(prompt);
        const ideas = result.response.text().trim();
        console.log(`✅ getProjectIdeas via ${modelName}`);
        return res.json({ success: true, data: { ideas, level: currentLevel } });
      } catch (err) {
        if (err.status === 404 || err.status === 429) continue;
        throw err;
      }
    }

    return res.status(429).json({ success: false, message: 'تعذّر إنشاء أفكار المشاريع حالياً.' });
  } catch (error) {
    console.error('getProjectIdeas error:', error.message);
    res.status(500).json({ success: false, message: 'حدثت مشكلة أثناء إنشاء أفكار المشاريع.' });
  }
};

module.exports = { chat, getHistory, clearHistory, summarize, saveSummary, getSummary, teacherAnalytics, getRemedialActivities, getProjectIdeas };
