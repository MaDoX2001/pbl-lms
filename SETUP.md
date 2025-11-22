# منصة التعلم بالمشروعات - دليل التشغيل السريع

## المتطلبات الأساسية

قبل البدء، تأكد من تثبيت:
- Node.js (الإصدار 16 أو أحدث)
- MongoDB (الإصدار 5 أو أحدث)
- npm أو yarn

## التثبيت والتشغيل

### الطريقة الأولى: التشغيل المحلي

#### 1. إعداد Backend

```powershell
# الانتقال إلى مجلد Backend
cd backend

# تثبيت الحزم
npm install

# نسخ ملف البيئة
Copy-Item .env.example .env

# تعديل ملف .env بإعدادات قاعدة البيانات الخاصة بك

# تشغيل الخادم
npm run dev
```

الخادم سيعمل على: http://localhost:5000

#### 2. إعداد Frontend

```powershell
# فتح نافذة PowerShell جديدة
# الانتقال إلى مجلد Frontend
cd frontend

# تثبيت الحزم
npm install

# نسخ ملف البيئة
Copy-Item .env.example .env

# تشغيل التطبيق
npm run dev
```

التطبيق سيعمل على: http://localhost:3000

### الطريقة الثانية: استخدام Docker

```powershell
# تشغيل جميع الخدمات
docker-compose up -d

# عرض السجلات
docker-compose logs -f

# إيقاف الخدمات
docker-compose down
```

## الوصول إلى المنصة

- **الواجهة الأمامية:** http://localhost:3000
- **API Backend:** http://localhost:5000
- **API Documentation:** http://localhost:5000/api
- **MongoDB:** localhost:27017

## الحسابات الافتراضية

يمكنك إنشاء حسابات جديدة من خلال صفحة التسجيل، أو استخدام الحسابات التجريبية بعد إنشائها:

### طالب:
- البريد الإلكتروني: student@example.com
- كلمة المرور: password123

### معلم:
- البريد الإلكتروني: teacher@example.com
- كلمة المرور: password123

## الميزات الرئيسية

### للطلاب:
- تصفح المشاريع التعليمية
- التسجيل في المشاريع
- تتبع التقدم والإنجازات
- كسب النقاط والمستويات
- المشاركة في المنتديات
- لوحة تحكم شخصية

### للمعلمين:
- إنشاء وإدارة المشاريع
- تحديد المراحل والمهام
- مراجعة تسليمات الطلاب
- تقييم الأعمال
- متابعة تقدم الطلاب

### المسؤول:
- إدارة المستخدمين
- إشراف على جميع المشاريع
- عرض الإحصائيات والتقارير

## البنية التقنية

### Backend:
- Node.js + Express.js
- MongoDB + Mongoose
- JWT للمصادقة
- bcryptjs للتشفير

### Frontend:
- React 18
- Redux Toolkit
- Material-UI (MUI)
- Vite
- React Router

## الاختبار

```powershell
# اختبار Backend
cd backend
npm test

# اختبار Frontend
cd frontend
npm test
```

## نصائح للتطوير

1. **تشغيل MongoDB محلياً:**
```powershell
mongod --dbpath C:\data\db
```

2. **عرض قاعدة البيانات:**
```powershell
mongosh
use pbl-lms
show collections
```

3. **تنظيف البيانات:**
```javascript
db.users.deleteMany({})
db.projects.deleteMany({})
db.progress.deleteMany({})
```

## حل المشاكل الشائعة

### خطأ في الاتصال بقاعدة البيانات:
- تأكد من تشغيل MongoDB
- تحقق من إعدادات MONGODB_URI في ملف .env

### خطأ في تثبيت الحزم:
```powershell
# حذف المجلدات وإعادة التثبيت
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### خطأ في المنفذ:
- تأكد من عدم استخدام المنافذ 3000 و 5000
- غير المنفذ في ملف .env

## المساهمة

نرحب بمساهماتكم! يرجى:
1. عمل Fork للمشروع
2. إنشاء فرع للميزة الجديدة
3. عمل Commit للتغييرات
4. إرسال Pull Request

## الترخيص

MIT License - انظر ملف LICENSE للتفاصيل

## الدعم

للمساعدة والدعم:
- افتح Issue على GitHub
- راسلنا على: support@pbl-lms.com

---

تم التطوير بـ ❤️ لتعليم البرمجة بطريقة عملية
