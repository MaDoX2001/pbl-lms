# منصة التعلم بالمشروعات - Project-Based Learning Platform

## نظرة عامة
منصة تعليمية متكاملة قائمة على أسلوب التعلم بالمشروعات (PBL) لتنمية مهارات البرمجة لدى الطلاب. توفر المنصة بيئة تفاعلية للتعلم من خلال مشاريع عملية ومراحل متدرجة.

## المميزات الرئيسية

### 1. إدارة المشاريع التعليمية
- إنشاء وإدارة مشاريع برمجية متدرجة الصعوبة
- تقسيم المشاريع إلى مراحل (Milestones) ومهام صغيرة
- ربط المشاريع بمهارات ومفاهيم برمجية محددة

### 2. نظام الطلاب والمعلمين
- تسجيل دخول آمن مع صلاحيات متعددة
- لوحة تحكم للمعلمين لمتابعة تقدم الطلاب
- ملفات شخصية للطلاب تعرض المشاريع المكتملة

### 3. التتبع والتقييم
- نظام نقاط وإنجازات (Gamification)
- تتبع تقدم الطالب في كل مشروع
- تقييمات آلية ومراجعات من المعلمين
- تقارير تفصيلية عن الأداء

### 4. التفاعل والتعاون
- منتدى للنقاش حول المشاريع
- إمكانية العمل الجماعي على المشاريع
- مشاركة الحلول والتعلم من الأقران

### 5. محرر أكواد مدمج
- بيئة تطوير مدمجة في المتصفح
- معاينة مباشرة للمشاريع
- دعم لغات برمجة متعددة

## التقنيات المستخدمة

### Backend
- **Node.js** مع **Express.js** - خادم API
- **MongoDB** مع **Mongoose** - قاعدة البيانات
- **JWT** - المصادقة والأمان
- **Socket.io** - التحديثات الفورية

### Frontend
- **React.js** - واجهة المستخدم
- **Redux** - إدارة الحالة
- **Material-UI** - تصميم الواجهة
- **Axios** - التواصل مع API
- **CodeMirror** - محرر الأكواد

### DevOps
- **Docker** - containerization
- **Jest** - الاختبارات
- **ESLint** - جودة الكود

## هيكل المشروع

```
project-based-lms/
├── backend/                 # خادم Node.js
│   ├── config/             # إعدادات التطبيق
│   ├── controllers/        # منطق العمليات
│   ├── models/            # نماذج قاعدة البيانات
│   ├── routes/            # مسارات API
│   ├── middleware/        # البرمجيات الوسيطة
│   └── server.js          # نقطة البداية
├── frontend/               # تطبيق React
│   ├── public/            # الملفات الثابتة
│   └── src/
│       ├── components/    # المكونات القابلة لإعادة الاستخدام
│       ├── pages/        # صفحات التطبيق
│       ├── redux/        # إدارة الحالة
│       ├── services/     # خدمات API
│       └── utils/        # أدوات مساعدة
├── docker-compose.yml     # إعداد Docker
└── README.md

```

## التثبيت والتشغيل

### المتطلبات
- Node.js (v16+)
- MongoDB (v5+)
- npm أو yarn

### خطوات التشغيل

1. **تثبيت Backend:**
```bash
cd backend
npm install
npm run dev
```

2. **تثبيت Frontend:**
```bash
cd frontend
npm install
npm start
```

3. **باستخدام Docker:**
```bash
docker-compose up
```

## متغيرات البيئة

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pbl-lms
JWT_SECRET=your_secret_key
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## واجهات API الرئيسية

### المصادقة
- `POST /api/auth/register` - تسجيل مستخدم جديد
- `POST /api/auth/login` - تسجيل الدخول

### المشاريع
- `GET /api/projects` - قائمة المشاريع
- `POST /api/projects` - إنشاء مشروع جديد
- `GET /api/projects/:id` - تفاصيل مشروع
- `PUT /api/projects/:id` - تحديث مشروع

### تقدم الطلاب
- `GET /api/progress/:studentId` - تقدم طالب معين
- `POST /api/progress/submit` - تسليم مشروع
- `PUT /api/progress/review` - مراجعة تسليم

### التقييمات
- `POST /api/assessments` - إنشاء تقييم
- `GET /api/assessments/:projectId` - تقييمات مشروع

## المساهمة
نرحب بالمساهمات! يرجى:
1. عمل Fork للمشروع
2. إنشاء فرع للميزة الجديدة
3. عمل Commit للتغييرات
4. إرسال Pull Request

## الترخيص
MIT License

## الدعم
للدعم والاستفسارات، يرجى فتح Issue على GitHub.
