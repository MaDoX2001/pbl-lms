# 🔔 نظام الإخطارات - توثيق التطبيق

## نظرة عامة
تم تطبيق نظام إخطارات شامل لحفظ وعرض إخطارات تقييم AI للمسؤولين (admins). يتم عرض الإخطارات في أيقونة بالبار العلوي (navbar) مع قائمة منسدلة تعرض جميع الإخطارات غير المقروءة والمقروءة.

---

## الميزات الرئيسية

### المسؤولين (Admin Users) فقط
- ✅ تلقي إخطارات تلقائية عند إكمال تقييم AI
- ✅ عرض جميع الإخطارات في أيقونة navbar مع العد غير المقروء
- ✅ فتح قائمة منسدلة لعرض آخر 10 إخطارات
- ✅ وضع علامة على الإخطارات كمقروءة
- ✅ حذف الإخطارات الفردية
- ✅ عرض صفحة كاملة لجميع الإخطارات مع التصفية والترتيب

### الإخطارات المدعومة حالياً
- **AI Evaluation**: عندما يكتمل تقييم AI لطالب ما
  - العنوان: اسم المشروع واسم الطالب
  - الرسالة: حالة التقييم (نجح/لم ينجح) والنسبة المئوية
  - الأهمية: عالية (failed) أو متوسطة (passed)

### التوسع المستقبلي
يمكن إضافة أنواع إخطارات أخرى بسهولة:
- `admin_message`: رسائل من المسؤولين
- `system`: إخطارات نظام
- وغيره...

---

## البنية التقنية

### Backend Components

#### 1. النموذج (Model)
**ملف**: `backend/models/Notification.model.js`
- URL: `/api/notifications`

```javascript
{
  type: String (enum: ['ai_evaluation', 'admin_message', 'system']),
  title: String,
  message: String,
  relatedProject: ObjectId (ref: 'Project'),
  relatedStudent: ObjectId (ref: 'User'),
  relatedEvaluation: ObjectId (ref: 'EvaluationAttempt'),
  relatedFinalEvaluation: ObjectId (ref: 'FinalEvaluation'),
  admin: ObjectId (ref: 'User', required),
  readAt: Date (null = unread),
  actionUrl: String,
  severity: String (enum: ['low', 'medium', 'high']),
  createdAt: Date (automatic),
  updatedAt: Date (automatic)
}
```

#### 2. تحكم (Controller)
**ملف**: `backend/controllers/notification.controller.js`

**الدوال الرئيسية:**
- `getNotifications(projectId, limit, page, unreadOnly)` - جلب إخطارات user مع pagination
- `getUnreadCount()` - عد الإخطارات غير المقروءة
- `markAsRead(notificationId)` - وضع علامة على إخطار واحد كمقروء
- `markAllAsRead()` - وضع علامة على جميع الإخطارات كمقروء
- `deleteNotification(notificationId)` - حذف إخطار واحد
- `deleteAllNotifications()` - حذف جميع الإخطارات
- `createNotification()` - function داخلي لإنشاء الإخطارات

#### 3. الطرق (Routes)
**ملف**: `backend/routes/notification.routes.js`

```
GET    /api/notifications                    - جلب إخطارات المسؤول
GET    /api/notifications/count/unread      - عد غير المقروء
PATCH  /api/notifications/:id/mark-read     - وضع علامة كمقروء
PATCH  /api/notifications/mark-all-read     - وضع علامة على الكل
DELETE /api/notifications/:id               - حذف إخطار واحد
DELETE /api/notifications                   - حذف الكل أو فيتر
```

**جميع الطرق تتطلب authentication (logged-in user)**

#### 4. التكامل مع تقييم AI
**ملف**: `backend/controllers/assessment.controller.js`

في دالة `finalizeEvaluation`:
```javascript
// عند انتهاء التقييم النهائي:
await notifyAdminsOfAIEvaluation(
  projectId,
  studentId,
  finalEvaluationId,
  finalPercentage,
  status // 'passed' or 'failed'
);
```

**دالة المساعد**: `notifyAdminsOfAIEvaluation()`
- تجد جميع المسؤولين في النظام
- تنشئ إخطار لكل مسؤول
- لا تلقي خطأ إذا فشلت (لا تؤثر على التقييم الرئيسي)

#### 5. تسجيل الطرق
**ملف**: `backend/server.js`
```javascript
app.use('/api/notifications', notificationRoutes);
```

---

### Frontend Components

#### 1. مكون قائمة الإخطارات (Notification Menu)
**ملف**: `frontend/src/components/NotificationMenu.jsx`

**الميزات:**
- أيقونة جرس مع عداد الإخطارات غير المقروءة
- قائمة منسدلة بـ 3 حالات:
  1. **حالة التحميل**: عرض spinner
  2. **حالة فارغة**: رسالة "لا توجد إخطارات"
  3. **حالة لديها إخطارات**: قائمة مع الإجراءات
- refresh تلقائي كل 30 ثانية
- عرض أيقونة الإخطار النشط عند وجود إخطارات غير مقروءة
- **متاح فقط للمسؤولين**

**UI Elements:**
- Badge برقم الإخطارات غير المقروءة (لون أحمر)
- رسالة الإخطار مع العنوان والمحتوى
- chip لدرجة الأهمية (عالي/عادي/منخفض) بألوان مختلفة
- زر mark-as-read لكل إخطار
- زر delete لكل إخطار
- زمن الإخطار بصيغة عربية (منذ X دقيقة/ساعة/يوم)
- رابط "عرض جميع الإخطارات" في الأسفل

**Polling:**
- يحدث refresh عند فتح القائمة
- يحدث polling تلقائي كل 30 ثانية في الخلفية

#### 2. صفحة الإخطارات الكاملة
**ملف**: `frontend/src/pages/NotificationsPage.jsx`

**الميزات:**
- جدول شامل لجميع الإخطارات مع pagination
- أزرار تصفية (ترتيب، عرض غير المقروء فقط)
- عرض الحالة (جديد/مقروء) بألوان مختلفة
- عرض النوع والأهمية والوقت
- زر تحديث يدوي
- زر "تحديد الكل كمقروء"
- زر "حذف الكل"
- **متاح فقط للمسؤولين**

#### 3. تحديث البار العلوي (Navbar)
**ملف**: `frontend/src/components/Navbar.jsx`

- استيراد `NotificationMenu` component
- إدراج أيقونة الإخطارات في مربع الأيقونات الأيمن (قبل قائمة الملف الشخصي)
- يظهر فقط عند تسجيل الدخول

#### 4. إضافة المسار (Route)
**ملف**: `frontend/src/App.jsx`

```javascript
<Route path="/dashboard/notifications" element={
  <PrivateRoute roles={['admin']}>
    <NotificationsPage />
  </PrivateRoute>
} />
```

---

## تدفق العمل

### سيناريو تقييم AI كامل

```
1. مسؤول يبدأ تقييم AI
   ↓
2. يتم توليد التقييم والتحقق من صحته
   ↓ (عبر generateAIEvaluationDraft)
   ↓
3. مسؤول يتائج النتائج والملاحظات
   ↓
4. مسؤول يضغط "تأكيد التقييم النهائي" (Finalize)
   ↓
5. في finalizeEvaluation:
   - حساب النتيجة النهائية
   - تحديد حالة النجاح/الفشل
   - منح الشارات إن انطبقت
   - تحديث مستوى الطالب
   - ✨ إنشاء إخطارات لجميع المسؤولين ✨
   - إرجاع النتيجة
   ↓
6. تظهر الإخطارات فوراً في navbar
   - أيقونة جرس بعدد غير المقروء
   - يمكن عرض تفاصيل الإخطار بفتح القائمة
   ↓
7. المسؤول يمكنه:
   - تحديد الإخطار كمقروء
   - حذف الإخطار
   - الاطلاع على صفحة الإخطارات الكاملة
```

---

## الاستخدام

### للمسؤول:
1. **عرض الإخطارات الجديدة**:
   - انقر على أيقونة الجرس في navbar
   - ستظهر آخر 10 إخطارات

2. **تحديد كمقروء**:
   - انقر على أيقونة رسالة مقروءة بجانب الإخطار

3. **حذف إخطار**:
   - انقر على أيقونة سلة المحذوفات

4. **عرض جميع الإخطارات**:
   - انقر على رابط "عرض جميع الإخطارات" في أسفل القائمة
   - أو اذهب مباشرة إلى `/dashboard/notifications`

5. **التصفية والترتيب**:
   - في صفحة الإخطارات الكاملة، استخدم زر "تصفية"
   - يمكنك الترتيب من الأحدث أو الأقدم
   - يمكنك عرض غير المقروء فقط

---

## التوسع المستقبلي

### للطلاب والمعلمين (Later):
يمكن تعديل النظام ليشمل:
- إخطارات حول رسائل جديدة
- إخطارات عن نتائج التقييم
- إخطارات عن الموارد الجديدة
- إخطارات عن تغييرات المشروع

يتم ذلك بـ:
1. إضافة check للدور في `NotificationMenu.jsx`
2. إزالة `roles={['admin']}` من route
3. إضافة عمليات منطقية جديدة لإنشاء الإخطارات عند الأحداث الأخرى

---

## الاختبار

### اختبار على الفور:
1. تأكد من تسجيل دخول مسؤول
2. قم بتشغيل تقييم AI لطالب
3. أكمل التقييم النهائي
4. تحقق من ظهور الإخطار في navbar
5. اختبر فتح/إغلاق القائمة
6. اختبر الزرار (تحديد كمقروء، حذف)
7. تحقق من إعادة refresh تلقائية للإخطارات

### ملاحظات المختبر:
- جميع الإخطارات مخزنة في قاعدة البيانات
- يمكن الوصول إليها حتى بعد إغلاق المتصفح
- تتم مشاركة الإخطارات بين جميع المسؤولين (كل مسؤول يرى نسختة الخاصة)

---

## الملفات المنشأة/المعدلة

### Backend:
- ✅ `backend/models/Notification.model.js` - نموذج قاعدة البيانات
- ✅ `backend/controllers/notification.controller.js` - التحكم والمنطق
- ✅ `backend/routes/notification.routes.js` - الطرق
- ✅ `backend/controllers/assessment.controller.js` - تكامل مع AI eval
- ✅ `backend/server.js` - تسجيل الطرق

### Frontend:
- ✅ `frontend/src/components/NotificationMenu.jsx` - القائمة المنسدلة
- ✅ `frontend/src/components/Navbar.jsx` - تحديث البار العلوي
- ✅ `frontend/src/pages/NotificationsPage.jsx` - صفحة كاملة
- ✅ `frontend/src/App.jsx` - إضافة route جديد

---

## ملاحظات إضافية

- ✅ جميع الرسائل والعناوين بالعربية
- ✅ التصميم متوافق مع RTL (العربية)
- ✅ تم استخدام MUI Material التي تطابق النمط الموجود
- ✅ معالجة الأخطاء بشكل آمن (فشل الإخطارات لا يوقف التقييم)
- ✅ Polling تلقائي بدون مكتبات خارجية إضافية
- ✅ Performance optimized (lazy loading للكمبوننتات)
- ✅ Responsive design (يعمل على الموبايل والديسكتوب)

---

**تم إعداده في**: أبريل 2026
**النسخة**: 1.0
