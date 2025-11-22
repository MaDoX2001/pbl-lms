const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User.model');
const Project = require('../models/Project.model');

dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ متصل بقاعدة البيانات');

    // Clear existing data
    await User.deleteMany({});
    await Project.deleteMany({});
    console.log('🗑️ تم حذف البيانات القديمة');

    // Create demo teacher
    const teacher = await User.create({
      name: 'أستاذ محمد',
      email: 'teacher@example.com',
      password: '123456',
      role: 'teacher',
      bio: 'معلم خبرة في تطوير البرمجيات'
    });

    // Create demo students
    const student1 = await User.create({
      name: 'أحمد محمود',
      email: 'student1@example.com',
      password: '123456',
      role: 'student'
    });

    const student2 = await User.create({
      name: 'فاطمة علي',
      email: 'student2@example.com',
      password: '123456',
      role: 'student'
    });

    console.log('✅ تم إنشاء المستخدمين التجريبيين');

    // Create demo projects
    const projects = [
      {
        title: 'تطبيق إدارة المهام',
        description: 'بناء تطبيق ويب لإدارة المهام اليومية باستخدام React و Node.js',
        shortDescription: 'تطبيق لإدارة المهام اليومية',
        objectives: [
          'تعلم React Hooks',
          'التعامل مع REST APIs',
          'إدارة الحالة باستخدام Redux',
          'بناء واجهات مستخدم تفاعلية'
        ],
        skills: [
          { name: 'React', level: 'intermediate' },
          { name: 'Node.js', level: 'intermediate' },
          { name: 'MongoDB', level: 'basic' }
        ],
        technologies: ['React', 'Express.js', 'MongoDB', 'Material-UI'],
        difficulty: 'intermediate',
        estimatedDuration: 160,
        category: 'web',
        isPublished: true,
        instructor: teacher._id,
        tags: ['react', 'nodejs', 'fullstack'],
        milestones: [
          {
            title: 'إعداد المشروع وتصميم الواجهة',
            description: 'إنشاء مشروع React وتصميم واجهة المستخدم',
            order: 1
          },
          {
            title: 'بناء الـ Backend APIs',
            description: 'إنشاء APIs لإدارة المهام',
            order: 2
          },
          {
            title: 'ربط Frontend بـ Backend',
            description: 'دمج الواجهة مع APIs',
            order: 3
          },
          {
            title: 'النشر والتسليم',
            description: 'نشر التطبيق على الإنترنت',
            order: 4
          }
        ]
      },
      {
        title: 'موقع تجارة إلكترونية',
        description: 'إنشاء متجر إلكتروني كامل مع نظام الدفع والسلة',
        shortDescription: 'متجر إلكتروني متكامل',
        objectives: [
          'بناء نظام المنتجات',
          'تطبيق سلة التسوق',
          'دمج بوابة الدفع'
        ],
        skills: [
          { name: 'E-commerce', level: 'advanced' },
          { name: 'Payment', level: 'intermediate' }
        ],
        technologies: ['Next.js', 'Stripe', 'PostgreSQL'],
        difficulty: 'advanced',
        estimatedDuration: 320,
        category: 'web',
        isPublished: true,
        instructor: teacher._id,
        tags: ['ecommerce', 'nextjs', 'stripe'],
        milestones: [
          {
            title: 'تصميم قاعدة البيانات',
            description: 'إنشاء Schema للمنتجات',
            order: 1
          },
          {
            title: 'بناء واجهة المتجر',
            description: 'صفحات المنتجات والسلة',
            order: 2
          }
        ]
      },
      {
        title: 'تطبيق الدردشة الفورية',
        description: 'تطبيق محادثات فورية باستخدام WebSocket',
        shortDescription: 'دردشة فورية بـ Socket.io',
        objectives: [
          'تعلم WebSocket',
          'بناء نظام الرسائل'
        ],
        skills: [
          { name: 'WebSocket', level: 'intermediate' },
          { name: 'Socket.io', level: 'intermediate' }
        ],
        technologies: ['Socket.io', 'React', 'Express'],
        difficulty: 'intermediate',
        estimatedDuration: 200,
        category: 'web',
        isPublished: true,
        instructor: teacher._id,
        tags: ['websocket', 'realtime', 'chat'],
        milestones: [
          {
            title: 'إعداد Socket.io',
            description: 'تثبيت وإعداد Socket.io',
            order: 1
          },
          {
            title: 'نظام الرسائل',
            description: 'إرسال واستقبال الرسائل',
            order: 2
          }
        ]
      },
      {
        title: 'تطبيق جوال بـ React Native',
        description: 'بناء تطبيق جوال متعدد المنصات',
        shortDescription: 'تطبيق جوال بـ React Native',
        objectives: [
          'تعلم React Native',
          'بناء واجهات جوال'
        ],
        skills: [
          { name: 'React Native', level: 'intermediate' },
          { name: 'Mobile Dev', level: 'intermediate' }
        ],
        technologies: ['React Native', 'Expo', 'Firebase'],
        difficulty: 'intermediate',
        estimatedDuration: 240,
        category: 'mobile',
        isPublished: true,
        instructor: teacher._id,
        tags: ['react-native', 'mobile', 'expo'],
        milestones: [
          {
            title: 'إعداد البيئة',
            description: 'تثبيت React Native',
            order: 1
          },
          {
            title: 'بناء الشاشات',
            description: 'إنشاء الشاشات الأساسية',
            order: 2
          }
        ]
      },
      {
        title: 'لعبة ويب تفاعلية',
        description: 'تطوير لعبة ويب باستخدام Canvas و JavaScript',
        shortDescription: 'لعبة ويب بـ HTML5 Canvas',
        objectives: [
          'تعلم HTML5 Canvas',
          'برمجة الرسوم المتحركة'
        ],
        skills: [
          { name: 'JavaScript', level: 'intermediate' },
          { name: 'Canvas', level: 'basic' }
        ],
        technologies: ['HTML5 Canvas', 'JavaScript', 'CSS3'],
        difficulty: 'beginner',
        estimatedDuration: 120,
        category: 'game-dev',
        isPublished: true,
        instructor: teacher._id,
        tags: ['canvas', 'game', 'javascript'],
        milestones: [
          {
            title: 'إعداد Canvas',
            description: 'رسم العناصر الأساسية',
            order: 1
          },
          {
            title: 'إضافة الحركة',
            description: 'تحريك العناصر',
            order: 2
          }
        ]
      }
    ];

    await Project.insertMany(projects);
    console.log('✅ تم إنشاء المشاريع التجريبية');

    console.log('\n🎉 تم إضافة البيانات التجريبية بنجاح!');
    console.log('\n📧 بيانات الدخول:');
    console.log('المعلم: teacher@example.com / 123456');
    console.log('الطالب 1: student1@example.com / 123456');
    console.log('الطالب 2: student2@example.com / 123456');

    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ:', error);
    process.exit(1);
  }
};

seedData();
