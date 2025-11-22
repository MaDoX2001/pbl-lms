# 🚀 دليل النشر السريع - 15 دقيقة

## الطريقة الأسرع (مجاناً تماماً!)

### 📋 قبل البدء، حضّر:
- [ ] حساب GitHub
- [ ] حساب MongoDB Atlas
- [ ] حساب Render
- [ ] حساب Vercel

---

## خطوة 1️⃣: رفع المشروع على GitHub (دقيقتان)

```powershell
# في مجلد المشروع
git init
git add .
git commit -m "Initial commit - PBL LMS Platform"

# أنشئ repository على GitHub ثم:
git remote add origin https://github.com/YOUR_USERNAME/pbl-lms.git
git branch -M main
git push -u origin main
```

---

## خطوة 2️⃣: إعداد قاعدة البيانات (5 دقائق)

1. اذهب لـ https://www.mongodb.com/cloud/atlas/register
2. اضغط **"Build a Database"**
3. اختر **FREE** (M0)
4. اختر Region قريب منك
5. اضغط **"Create Cluster"**
6. انتظر 3-5 دقائق
7. اضغط **"Connect"** → **"Connect your application"**
8. انسخ Connection String:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/pbl-lms
   ```
9. احفظه، هتحتاجه!

---

## خطوة 3️⃣: نشر Backend على Render (5 دقائق)

1. اذهب لـ https://render.com/
2. سجل دخول بحساب GitHub
3. اضغط **"New +"** → **"Web Service"**
4. اختر repository **pbl-lms**
5. املأ البيانات:
   ```
   Name: pbl-lms-backend
   Region: Frankfurt (أو الأقرب لك)
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install
   Start Command: node server.js
   ```
6. اضغط **"Advanced"** وأضف Environment Variables:
   ```
   PORT = 5000
   NODE_ENV = production
   MONGODB_URI = <الـ Connection String من MongoDB>
   JWT_SECRET = اي_كلمة_سر_طويلة_عشوائية_123456789
   JWT_EXPIRE = 7d
   CLIENT_URL = https://pbl-lms.vercel.app
   ```
7. اختر **Free Plan**
8. اضغط **"Create Web Service"**
9. انتظر 5 دقائق حتى يبني المشروع
10. **احفظ الرابط!** مثل: `https://pbl-lms-backend.onrender.com`

---

## خطوة 4️⃣: نشر Frontend على Vercel (3 دقائق)

1. اذهب لـ https://vercel.com/
2. سجل دخول بحساب GitHub
3. اضغط **"Add New..."** → **"Project"**
4. اختر repository **pbl-lms**
5. املأ الإعدادات:
   ```
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   ```
6. اضغط **"Environment Variables"**:
   ```
   Name: VITE_API_URL
   Value: https://pbl-lms-backend.onrender.com/api
   ```
   (استخدم رابط Backend من الخطوة السابقة!)
7. اضغط **"Deploy"**
8. انتظر 2-3 دقائق
9. 🎉 **خلاص! موقعك شغال!**
10. الرابط: `https://pbl-lms-XXXXX.vercel.app`

---

## خطوة 5️⃣: تحديث إعدادات Backend

1. ارجع لـ Render Dashboard
2. اختر **pbl-lms-backend**
3. اضغط **"Environment"**
4. حدّث `CLIENT_URL` بالرابط الحقيقي من Vercel
5. احفظ → سيعيد Deploy تلقائياً

---

## ✅ اختبار الموقع

1. افتح رابط Vercel
2. اضغط **"إنشاء حساب"**
3. سجل كطالب أو معلم
4. جرب تصفح المشاريع
5. 🎊 مبروك! موقعك شغال على النت!

---

## 🎯 خطوات إضافية (اختيارية)

### إضافة Domain خاص بك:

**في Vercel:**
1. Settings → Domains
2. أضف domain الخاص بك
3. اتبع التعليمات لتحديث DNS

### إضافة بيانات تجريبية:

شغل من جهازك المحلي:
```powershell
# عدل في seed.ps1 واستبدل localhost برابط Render
$backendUrl = "https://pbl-lms-backend.onrender.com/api"
# ثم شغل:
.\seed.ps1
```

---

## 🐛 حل المشاكل

### Backend لا يعمل؟
- افتح Render Dashboard → Logs
- تأكد من MONGODB_URI صحيح
- تأكد من MongoDB IP Whitelist يسمح لكل الـ IPs: `0.0.0.0/0`

### Frontend لا يتصل بـ Backend؟
- تأكد من VITE_API_URL صحيح
- افتح Console في المتصفح (F12)
- تأكد من CORS مضبوط في Backend

### قاعدة البيانات لا تتصل؟
- في MongoDB Atlas → Network Access
- أضف `0.0.0.0/0` للسماح لكل الـ IPs

---

## 💡 نصائح Pro

1. **Render Free Tier** بيدخل في Sleep بعد 15 دقيقة عدم استخدام
   - الحل: استخدم UptimeRobot لعمل ping كل 5 دقائق
   
2. **Vercel** بيدعم auto-deploy من GitHub
   - أي commit جديد = deploy تلقائي!

3. **احتفظ بنسخة من Environment Variables**
   - احفظهم في ملف آمن

---

## 📊 مراقبة الموقع

استخدم (مجاناً):
- **Uptime Robot**: https://uptimerobot.com
- **Google Analytics**: للإحصائيات
- **Sentry**: لتتبع الأخطاء

---

## 🎉 تهانينا!

موقعك الآن شغال على النت! شارك الرابط مع أصدقائك 🚀

**رابط الموقع:** `https://pbl-lms-XXXXX.vercel.app`

---

**وقت النشر الكلي: 15 دقيقة فقط! ⚡**
