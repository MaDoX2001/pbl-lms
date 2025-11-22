# دليل نشر المنصة على الإنترنت 🌐

هذا الدليل يشرح كيفية نشر منصة التعلم بالمشروعات على الإنترنت لتصبح متاحة للجميع.

## الخيارات المتاحة للنشر

### 🎯 الخيار الأول: Vercel + MongoDB Atlas (مجاني - موصى به للمبتدئين)

#### 1. إعداد قاعدة البيانات (MongoDB Atlas)

**خطوات الإعداد:**

1. اذهب إلى https://www.mongodb.com/cloud/atlas/register
2. أنشئ حساب مجاني
3. أنشئ Cluster جديد (اختر الخطة المجانية)
4. انتظر حتى يتم إنشاء الـ Cluster (5 دقائق تقريباً)
5. اضغط على "Connect" ثم "Connect your application"
6. انسخ connection string وسيكون بهذا الشكل:
   ```
   mongodb+srv://maaadooo2001_db_user:XBn6XqKXsSbI57uP@madrox.u8jh8xr.mongodb.net/
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/pbl-lms?retryWrites=true&w=majority
   ```

#### 2. نشر Backend (على Render أو Railway)

##### استخدام Render (مجاني):

1. اذهب إلى https://render.com وأنشئ حساب
2. اضغط "New +" ثم "Web Service"
3. اربط حساب GitHub الخاص بك
4. ارفع المشروع على GitHub أولاً
5. اختر repository المشروع
6. املأ البيانات:
   - **Name:** pbl-lms-backend
   - **Root Directory:** backend
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
7. أضف Environment Variables:
   ```
   PORT=5000
   MONGODB_URI=<connection string من MongoDB Atlas>
   JWT_SECRET=<كلمة سر عشوائية قوية>
   JWT_EXPIRE=7d
   NODE_ENV=production
   CLIENT_URL=<رابط Frontend بعد نشره>
   ```
8. اضغط "Create Web Service"
9. انتظر حتى يكتمل البناء (5-10 دقائق)
10. انسخ رابط الـ Backend (مثل: https://pbl-lms-backend.onrender.com)

##### استخدام Railway (بديل):

1. اذهب إلى https://railway.app
2. سجل دخول بحساب GitHub
3. اضغط "New Project" ثم "Deploy from GitHub repo"
4. اختر المشروع
5. أضف المتغيرات البيئية مثل Render
6. Railway سيكتشف Node.js تلقائياً ويبني المشروع

#### 3. نشر Frontend (على Vercel)

1. اذهب إلى https://vercel.com وسجل دخول بحساب GitHub
2. اضغط "Add New" ثم "Project"
3. اختر repository المشروع
4. املأ الإعدادات:
   - **Framework Preset:** Vite
   - **Root Directory:** frontend
   - **Build Command:** `npm run build`
   - **Output Directory:** dist
5. أضف Environment Variable:
   ```
   VITE_API_URL=<رابط Backend من Render>
   ```
   مثال: `VITE_API_URL=https://pbl-lms-backend.onrender.com/api`
6. اضغط "Deploy"
7. انتظر حتى يكتمل النشر (2-3 دقائق)
8. سيعطيك Vercel رابط مثل: https://pbl-lms.vercel.app

#### 4. تحديث إعدادات Backend

ارجع لإعدادات Backend على Render وحدث:
```
CLIENT_URL=<رابط Vercel للـ Frontend>
```
مثال: `CLIENT_URL=https://pbl-lms.vercel.app`

---

### 🚀 الخيار الثاني: Netlify + Heroku (بديل)

#### Backend على Heroku:

1. اذهب إلى https://heroku.com وأنشئ حساب
2. ثبت Heroku CLI:
   ```powershell
   # ثبت من: https://devcenter.heroku.com/articles/heroku-cli
   ```
3. سجل دخول:
   ```powershell
   heroku login
   ```
4. أنشئ تطبيق:
   ```powershell
   cd backend
   heroku create pbl-lms-backend
   ```
5. أضف MongoDB Add-on أو استخدم Atlas
6. أضف المتغيرات:
   ```powershell
   heroku config:set MONGODB_URI="your-mongodb-uri"
   heroku config:set JWT_SECRET="your-secret"
   heroku config:set NODE_ENV=production
   ```
7. انشر:
   ```powershell
   git push heroku main
   ```

#### Frontend على Netlify:

1. اذهب إلى https://netlify.com
2. اسحب مجلد frontend/dist بعد build
3. أو اربط GitHub repository مباشرة
4. أضف Environment Variable:
   ```
   VITE_API_URL=<رابط Heroku Backend>
   ```

---

### 💎 الخيار الثالث: VPS (خادم افتراضي خاص)

إذا كنت تريد تحكم كامل، استخدم VPS مثل:
- **DigitalOcean** (~$5/شهر)
- **Linode** (~$5/شهر)
- **AWS EC2** (Free tier لسنة)
- **Google Cloud** (Free tier محدود)

#### خطوات النشر على VPS:

1. **أنشئ VPS:**
   - اختر Ubuntu 22.04 LTS
   - حجم: 1GB RAM على الأقل

2. **اتصل بالخادم:**
   ```powershell
   ssh root@your-server-ip
   ```

3. **ثبت المتطلبات:**
   ```bash
   # تحديث النظام
   apt update && apt upgrade -y
   
   # تثبيت Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   apt install -y nodejs
   
   # تثبيت MongoDB
   curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   apt update
   apt install -y mongodb-org
   systemctl start mongod
   systemctl enable mongod
   
   # تثبيت Nginx
   apt install -y nginx
   
   # تثبيت PM2
   npm install -g pm2
   ```

4. **ارفع المشروع:**
   ```bash
   cd /var/www
   git clone your-repo-url pbl-lms
   cd pbl-lms
   
   # Backend
   cd backend
   npm install --production
   cp .env.example .env
   # عدل .env بالإعدادات الصحيحة
   pm2 start server.js --name pbl-backend
   
   # Frontend
   cd ../frontend
   npm install
   npm run build
   ```

5. **أعد Nginx:**
   ```bash
   nano /etc/nginx/sites-available/pbl-lms
   ```
   
   أضف هذا المحتوى:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       # Frontend
       location / {
           root /var/www/pbl-lms/frontend/dist;
           try_files $uri $uri/ /index.html;
       }
       
       # Backend API
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   ```bash
   ln -s /etc/nginx/sites-available/pbl-lms /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

6. **أضف SSL (HTTPS):**
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d your-domain.com
   ```

7. **اضبط PM2 للبدء التلقائي:**
   ```bash
   pm2 startup
   pm2 save
   ```

---

### 🔐 إعدادات الأمان المهمة

قبل النشر، تأكد من:

1. **تغيير JWT_SECRET:**
   ```
   JWT_SECRET=<كلمة سر عشوائية طويلة جداً>
   ```
   استخدم: https://randomkeygen.com/

2. **تحديث CORS:**
   في `backend/server.js`، حدث:
   ```javascript
   cors({
     origin: ['https://your-frontend-domain.com'],
     credentials: true
   })
   ```

3. **استخدام HTTPS فقط**

4. **إخفاء معلومات الخطأ في Production:**
   في `backend/server.js`، الكود موجود بالفعل

---

### 📊 مراقبة الأداء

استخدم:
- **Uptime Robot** - مراقبة التوفر (مجاني)
- **Google Analytics** - تحليل الزوار
- **Sentry** - تتبع الأخطاء
- **PM2 Monitoring** (على VPS)

---

### 💰 تقدير التكاليف

#### الحل المجاني (للبداية):
- MongoDB Atlas: مجاني (512 MB)
- Render/Railway: مجاني (محدود)
- Vercel: مجاني
- **الإجمالي: 0$ شهرياً**

#### الحل الاحترافي:
- MongoDB Atlas: ~$9/شهر (2GB)
- VPS (DigitalOcean): $6/شهر
- Domain: ~$10/سنة
- **الإجمالي: ~$15-20/شهر**

---

### 🎓 الخطوات الموصى بها للمبتدئين

1. ✅ ابدأ بـ MongoDB Atlas (مجاني)
2. ✅ انشر Backend على Render (مجاني)
3. ✅ انشر Frontend على Vercel (مجاني)
4. ✅ اشتري Domain من Namecheap (~$10/سنة)
5. ✅ اربط Domain بـ Vercel
6. 🚀 موقعك شغال على النت!

---

### 📞 الدعم والمساعدة

إذا واجهت أي مشاكل:
1. راجع logs الـ hosting service
2. تأكد من Environment Variables صحيحة
3. تأكد من connection string قاعدة البيانات
4. تحقق من CORS settings

---

**جاهز للنشر؟ ابدأ بالخيار الأول (Vercel + Render)! 🚀**
