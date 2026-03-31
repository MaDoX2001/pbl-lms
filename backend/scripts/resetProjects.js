const mongoose = require('mongoose');
require('dotenv').config();

const Project = require('../models/Project.model');
const ObservationCard = require('../models/ObservationCard.model');

const newProject = {
  title: 'التعرف على المنصة وتشغيل LED الداخلي بلوحة Arduino',
  shortDescription: 'مشروع تمهيدي يهدف إلى تعريف الطلاب بالمنصة الرقمية وبيئة المحاكاة من خلال التحكم في LED الداخلي بلوحة Arduino.',
  description: 'يُعد هذا المشروع مدخلًا تمهيديًا لمقرر برمجة الأنظمة الذكية، ويهدف إلى تهيئة الطلاب للتعامل مع المنصة الرقمية التعليمية وبيئة المحاكاة، والتعرف على لوحة Arduino ووظيفة المخرجات من خلال تنفيذ برنامج بسيط للتحكم في LED الداخلي المدمج باللوحة.\nيركز المشروع على بناء الجاهزية الرقمية والمعرفية، دون التطرق إلى توصيلات خارجية أو تعقيدات برمجية، بما يسهم في بناء الثقة لدى الطلاب قبل الانتقال إلى مشروعات التعلم القائم على المشروعات.',
  difficulty: 'beginner',
  category: 'other',
  technologies: ['Arduino', 'LED', 'Simulation'],
  objectives: [
    'أن يتمكن الطالب من التعرف على واجهة المنصة الرقمية التعليمية واستخدامها في الدخول إلى بيئة المحاكاة بدقة لا تقل عن 85%.',
    'أن يتمكن الطالب من تفسير مفهوم المخرج (Output) في الأنظمة الذكية من خلال LED الداخلي بلوحة Arduino بدقة لا تقل عن 85%.',
    'أن يتمكن الطالب من تنفيذ برنامج بسيط لتشغيل وإيقاف LED الداخلي باستخدام لوحة Arduino داخل بيئة المحاكاة بدرجة إتقان مقبولة.'
  ],
  showObjectives: true,
  estimatedDuration: 4,
  deadline: new Date('2026-02-20T23:59:00'),
  learningScenario: `1. يبدأ المتعلم بالدخول إلى المنصة الرقمية التعليمية.
2. يتعرف على أقسام المنصة وواجهة المستخدم.
3. يفتح بيئة المحاكاة الرقمية.
4. يختار لوحة Arduino Uno داخل المحاكاة.
5. يتعرف على LED الداخلي المدمج باللوحة.
6. يكتب برنامجًا بسيطًا لتشغيل وإيقاف LED الداخلي.
7. يشغّل البرنامج ويتحقق من نجاح التنفيذ.
8. يسلّم تقرير المشروع المختصر.`,
  teachingStrategy: `1. التعلم القائم على المشروعات (Project-Based Learning)
2. التعلم الذاتي الموجَّه`,
  finalReportNote: 'يقوم المتعلم بإعداد تقرير مختصر يوضح خطوات الدخول إلى المنصة، فكرة المشروع، وصف LED الداخلي، وصورة من تنفيذ المحاكاة، ويُعد هذا التقرير هو المنتج النهائي للمشروع.',
  points: 50,
  isPublished: true,
  order: 0,
  isTeamProject: false
};

const individualCard = {
  phase: 'individual_oral',
  sections: [
    {
      name: 'التعامل مع المنصة الرقمية',
      weight: 40,
      criteria: [
        {
          name: 'إنشاء الحساب وتسجيل الدخول',
          applicableRoles: ['all'],
          options: [
            { percentage: 0, description: 'لم يؤد المعيار.' },
            { percentage: 50, description: 'أدى المعيار مع أخطاء واضحة.' },
            { percentage: 100, description: 'أدى المعيار بشكل صحيح تماما.' }
          ]
        },
        {
          name: 'التنقل داخل المنصة',
          applicableRoles: ['all'],
          options: [
            { percentage: 0, description: 'لم يؤد المعيار.' },
            { percentage: 50, description: 'أدى المعيار مع أخطاء واضحة.' },
            { percentage: 100, description: 'أدى المعيار بشكل صحيح تماما.' }
          ]
        }
      ]
    },
    {
      name: 'التنفيذ البرمجي',
      weight: 60,
      criteria: [
        {
          name: 'اختيار لوحة Arduino',
          applicableRoles: ['all'],
          options: [
            { percentage: 0, description: 'لم يؤد المعيار.' },
            { percentage: 50, description: 'أدى المعيار مع أخطاء واضحة.' },
            { percentage: 100, description: 'أدى المعيار بشكل صحيح تماما.' }
          ]
        },
        {
          name: 'التحكم في LED الداخلي',
          applicableRoles: ['all'],
          options: [
            { percentage: 0, description: 'لم يؤد المعيار.' },
            { percentage: 50, description: 'أدى المعيار مع أخطاء واضحة.' },
            { percentage: 100, description: 'أدى المعيار بشكل صحيح تماما.' }
          ]
        }
      ]
    }
  ]
};

async function resetProjects() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete all existing projects
    const deletedProjects = await Project.deleteMany({});
    console.log(`🗑️  Deleted ${deletedProjects.deletedCount} existing projects`);

    // Delete all observation cards
    const deletedCards = await ObservationCard.deleteMany({});
    console.log(`🗑️  Deleted ${deletedCards.deletedCount} existing observation cards`);

    // Create new project
    const project = await Project.create(newProject);
    console.log('✅ Created new project:', project.title);
    console.log('   Project ID:', project._id);

    // Create observation card for individual evaluation
    const card = await ObservationCard.create({
      project: project._id,
      phase: individualCard.phase,
      sections: individualCard.sections
    });
    console.log('✅ Created observation card for individual evaluation');

    console.log('\n🎉 Project reset completed successfully!');
    console.log('\nProject Details:');
    console.log('- Title:', project.title);
    console.log('- Order:', project.order);
    console.log('- Points:', project.points);
    console.log('- Published:', project.isPublished);
    console.log('- Team Project:', project.isTeamProject);
    console.log('- Deadline:', project.deadline);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting projects:', error);
    process.exit(1);
  }
}

resetProjects();
