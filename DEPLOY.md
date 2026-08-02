# دليل نشر وتثبيت النظام على Linux (Deployment Guide)

هذا الدليل يشرح كيفية تثبيت ونشر نظام **Macro Workflow & ITSM System** في بيئة الإنتاج على خوادم **Linux (Ubuntu / Debian)** خطوة بخطوة، بطريقة سهلة ومبسطة ومخصصة للمبتدئين في نظام لينكس.

---

## المتطلبات الأساسية (Prerequisites)
1. خادم يعمل بنظام تشغيل **Linux (Ubuntu / Debian)**.
2. حساب يمتلك صلاحيات المسؤول (عبر استخدام كلمة `sudo` قبل الأوامر).

---

## أولاً: تثبيت وإعداد قاعدة بيانات MySQL (Install & Configure MySQL)

بما أنك بحاجة إلى تثبيت خادم MySQL من الصفر على خادم لينكس، اتبع الخطوات التالية بدقة:

### 1. تثبيت حزم MySQL:
افتح الترمينال (Terminal) واكتب الأوامر التالية لتحديث مستودعات النظام وتثبيت MySQL Server:
```bash
sudo apt update
sudo apt install mysql-server -y
```

### 2. تشغيل خدمة MySQL والتأكد من أنها تعمل تلقائياً:
قم بتشغيل الخدمة وجعلها تبدأ تلقائياً عند إعادة تشغيل السيرفر:
```bash
sudo systemctl start mysql
sudo systemctl enable mysql
```
*للتأكد من أن قاعدة البيانات تعمل بنجاح، يمكنك كتابة:* `sudo systemctl status mysql`

### 3. إنشاء قاعدة البيانات والمستخدم وضبط الصلاحيات:
سندخل الآن إلى واجهة سطر أوامر MySQL بصلاحيات الـ root لإنشاء مستخدم خاص بالنظام وقاعدة البيانات.

اكتب الأمر التالي للدخول إلى MySQL:
```bash
sudo mysql
```

بمجرد دخولك وتغير شكل مؤشر الكتابة إلى `mysql>`، قم بنسخ وتشغيل الأوامر التالية بالترتيب (مع استبدال `YourStrongPassword` بكلمة مرور قوية من اختيارك):

```sql
-- 1. إنشاء قاعدة البيانات باسم emacro_dashboard مع دعم كامل للغة العربية
CREATE DATABASE emacro_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. إنشاء مستخدم جديد للنظام وتحديد كلمة مرور له
CREATE USER 'emacro_user'@'localhost' IDENTIFIED BY 'YourStrongPassword';

-- 3. إعطاء هذا المستخدم الصلاحيات الكاملة للتحكم في قاعدة بيانات النظام
GRANT ALL PRIVILEGES ON emacro_dashboard.* TO 'emacro_user'@'localhost';

-- 4. تحديث الصلاحيات وتطبيق التعديلات فوراً
FLUSH PRIVILEGES;

-- 5. الخروج من واجهة MySQL والعودة لسطر أوامر لينكس
EXIT;
```

---

## ثانياً: تثبيت Node.js ومدير العمليات PM2

يحتاج تطبيق الويب إلى بيئة تشغيل Node.js، بالإضافة إلى أداة PM2 التي تضمن بقاء التطبيق يعمل في الخلفية حتى لو أغلقنا نافذة الأوامر أو عند حدوث أي خطأ مفاجئ.

قم بتشغيل الأوامر التالية بالترتيب:
```bash
# تثبيت Node.js ومدير الحزم npm
sudo apt install nodejs npm -y

# تثبيت أداة PM2 على مستوى النظام ككل
sudo npm install -g pm2
```
*ملاحظة: يفضل أن يكون إصدار Node.js هو 18 أو أحدث.*

---

## ثالثاً: تجهيز وتشغيل المشروع

1. انتقل إلى المجلد الذي وضعت فيه كود المشروع على السيرفر (مثال: `/var/www/workflow-engine`):
   ```bash
   cd /var/www/workflow-engine
   ```
2. تثبيت الحزم البرمجية والاعتماديات:
   ```bash
   npm install
   ```
3. بناء نسخة الإنتاج (Build) لتجهيز ملفات التطبيق للتشغيل الفعلي السريع:
   ```bash
   npm run build
   ```
4. إنشاء وتأكيد جداول قاعدة البيانات عبر السكربت المرفق بالمشروع:
   ```bash
   node emacro_db_check.js
   ```
5. تشغيل التطبيق في الخلفية باستخدام PM2:
   ```bash
   pm2 start npm --name "workflow-system" -- start
   ```
6. لضمان تشغيل التطبيق تلقائياً إذا تم عمل إعادة تشغيل (Restart) للسيرفر كاملاً:
   ```bash
   pm2 startup
   pm2 save
   ```

---

## رابعاً: إعداد خادم Nginx كـ Reverse Proxy

تطبيق Next.js يعمل بشكل افتراضي على المنفذ الداخلي 3000. لجعل المستخدمين يدخلون إلى النظام مباشرة عبر المنفذ 80 (المنفذ الافتراضي لتصفح الويب) أو الدومين الخاص بك دون كتابة `:3000`، نستخدم **Nginx**.

1. تثبيت Nginx:
   ```bash
   sudo apt install nginx -y
   ```
2. فتح ملف إعدادات جديد للموقع:
   ```bash
   sudo nano /etc/nginx/sites-available/workflow
   ```
3. الصق النص التالي داخل الملف (مع استبدال `yourdomain.com` برابط موقعك أو عنوان IP الخاص بالسيرفر):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```
   *(لحفظ الملف في محرّر nano: اضغط على `Ctrl + O` ثم `Enter`، وللخروج اضغط على `Ctrl + X`)*

4. ربط وتفعيل الإعدادات الجديدة وفحصها:
   ```bash
   sudo ln -s /etc/nginx/sites-available/workflow /etc/nginx/sites-enabled/
   sudo nginx -t
   ```
   *(إذا ظهرت رسالة success، فهذا يعني أن الإعدادات صحيحة)*

5. إعادة تشغيل Nginx لتطبيق التغييرات:
   ```bash
   sudo systemctl restart nginx
   ```

---

## خامساً: المتغيرات البيئية للإنتاج (Environment Variables)

تأكد من إنشاء ملف `.env.local` داخل مجلد المشروع يحتوي على الرابط الصحيح للاتصال بقاعدة البيانات التي أنشأناها في الخطوة الأولى:
```env
DATABASE_URL=mysql://emacro_user:YourStrongPassword@localhost:3306/emacro_dashboard
PORT=3000
NODE_ENV=production
```
*(احرص على استبدال `YourStrongPassword` بكلمة المرور الحقيقية التي اخترتها)*
