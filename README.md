# 🌐 محرك تدفق العمل والمعاملات الذكي | Macro Workflow System

نظام إدارة وتصميم نماذج تدفق العمل والمعاملات الذكي (Workflows & ITSM Engine) المبني باستخدام تقنيات **Next.js (React)** و **MySQL** كقاعدة بيانات خلفية، مع دعم كامل للربط المرن وتوزيع المهام التلقائي.

---

## 🚀 التشغيل المحلي (Local Development)

### المتطلبات الأساسية (Prerequisites)
- **Node.js** (إصدار 18 أو أحدث)
- **MySQL Database Server**

### خطوات التشغيل
1. **تثبيت الحزم والمكتبات:**
   ```bash
   npm install
   ```

2. **تهيئة ملفات الإعدادات البيئية (`.env.local`):**
   قم بإنشاء ملف `.env.local` في المجلد الرئيسي للمشروع وأضف إعدادات الاتصال بقاعدة البيانات:
   ```env
   DATABASE_URL=mysql://username:password@localhost:3306/db_name
   ```

3. **تشغيل خادم التطوير المحلي:**
   ```bash
   npm run dev
   ```
   افتح المتصفح واذهب إلى الرابط: [http://localhost:3000](http://localhost:3000)

4. **بناء النسخة الإنتاجية وتشغيلها محلياً:**
   ```bash
   npm run build
   ```
   ثم لتشغيل خادم الإنتاج:
   ```bash
   npm run start
   ```

---

## 🪟 التشغيل على خادم Windows IIS (Deployment on IIS)

لتشغيل تطبيق Next.js على خادم IIS، نستخدم أداة **iisnode** لتمكين تشغيل تطبيقات Node.js كخلفية داخل خادم ويب مايكروسوفت.

### المتطلبات (Requirements)
1. **تثبيت Node.js** على السيرفر.
2. **تثبيت IIS URL Rewrite Module** ([تحميل من مايكروسوفت](https://www.iis.net/downloads/microsoft/url-rewrite)).
3. **تثبيت iisnode** ([تحميل من GitHub](https://github.com/Azure/iisnode/releases)).

### خطوات التثبيت والإعداد
1. **بناء المشروع (Build) محلياً أو على السيرفر:**
   ```bash
   npm run build
   ```

2. **إنشاء ملف إدخال Node.js لـ IIS (مثال: `server.js`):**
   قم بإنشاء ملف باسم `server.js` في المجلد الرئيسي للمشروع ليوجه IIS لتشغيل خادم Next.js:
   ```javascript
   const { createServer } = require('http');
   const { parse } = require('url');
   const next = require('next');

   const dev = false;
   const hostname = 'localhost';
   const port = process.env.PORT || 3000;
   const app = next({ dev, hostname, port });
   const handle = app.getRequestHandler();

   app.prepare().then(() => {
     createServer(async (req, res) => {
       try {
         const parsedUrl = parse(req.url, true);
         await handle(req, res, parsedUrl);
       } catch (err) {
         console.error('Error occurred handling', req.url, err);
         res.statusCode = 500;
         res.end('Internal Server Error');
       }
     }).listen(port, (err) => {
       if (err) throw err;
       console.log(`> Ready on http://${hostname}:${port}`);
     });
   });
   ```

3. **إعداد ملف الويب لـ IIS (`web.config`):**
   قم بإنشاء ملف `web.config` في المجلد الرئيسي لتوجيه الطلبات عبر iisnode:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <configuration>
     <system.webServer>
       <handlers>
         <add name="iisnode" path="server.js" verb="*" modules="iisnode" />
       </handlers>
       <rewrite>
         <rules>
           <rule name="NextStatic" stopProcessing="true">
             <match url="^(_next|static|public)/.*" />
             <action type="None" />
           </rule>
           <rule name="DynamicContent">
             <conditions>
               <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True" />
             </conditions>
             <action type="Rewrite" url="server.js" />
           </rule>
         </rules>
       </rewrite>
       <security>
         <requestFiltering>
           <hiddenSegments>
             <add segment="node_modules" />
           </hiddenSegments>
         </requestFiltering>
       </security>
       <httpErrors existingResponse="PassThrough" />
     </system.webServer>
   </configuration>
   ```

4. **إضافة الموقع in IIS:**
   - افتح **IIS Manager**.
   - اضغط بالزر الأيمن على **Sites** ثم اختر **Add Website**.
   - اختر اسم الموقع، وحدد **Physical Path** ليشير إلى مجلد المشروع الرئيسي.
   - حدد منفذ الوصول (Port) أو الـ Domain واضغط **OK**.
   - تأكد من إعطاء حساب المجموعات الافتراضية لـ IIS (`IIS_IUSRS`) صلاحيات القراءة والكتابة على مجلد المشروع.

---

## 🐧 التشغيل على خادم Linux (Ubuntu / RHEL)

تعتبر طريقة التشغيل باستخدام **PM2** كمدير عمليات (Process Manager) مع **Nginx** كخادم عكسي (Reverse Proxy) هي الطريقة القياسية والأنسب إنتاجياً لبيئات Linux.

### الخطوة 1: تثبيت Node.js و PM2
قم بفتح الطرفية وتحديث الحزم ثم تثبيت Node.js و PM2 عالمياً:
```bash
sudo apt update
sudo apt install nodejs npm -y
sudo npm install -g pm2
```

### الخطوة 2: بناء المشروع وتشغيله باستخدام PM2
1. انتقل لمجلد المشروع:
   ```bash
   cd /var/www/workflow-engine
   ```
2. تثبيت الحزم وبناء المشروع:
   ```bash
   npm install
   npm run build
   ```
3. تشغيل الخدمة عبر PM2 لضمان استمراريتها حتى عند حدوث أخطاء أو إعادة تشغيل الخادم:
   ```bash
   pm2 start npm --name "workflow-system" -- start
   ```
4. تمكين PM2 من البدء تلقائياً مع إقلاع نظام التشغيل:
   ```bash
   pm2 startup
   pm2 save
   ```

### الخطوة 3: إعداد Nginx كخادم عكسي (Reverse Proxy)
1. تثبيت خادم Nginx:
   ```bash
   sudo apt install nginx -y
   ```
2. إنشاء ملف إعدادات جديد للموقع:
   ```bash
   sudo nano /etc/nginx/sites-available/workflow
   ```
3. أضف الإعدادات التالية (مع استبدال `yourdomain.com` برابط السيرفر أو الآي بي الخاص بك):
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
4. تفعيل الموقع وإعادة تشغيل Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/workflow /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

الموقع الآن يعمل بكفاءة وتلقائية في الخلفية على بيئة خادم Linux! 🚀
