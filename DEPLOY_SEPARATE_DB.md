# دليل نشر النظام مع فصل خادم قاعدة البيانات (Separate Database Server Deployment Guide)

هذا الدليل يشرح كيفية نشر وتثبيت النظام عندما يكون **خادم قاعدة البيانات (MySQL)** في سيرفر مستقل (Server A)، بينما **خادم التطبيق (Next.js Application)** في سيرفر آخر منفصل (Server B).

---

## المخطط العام للربط (Architecture Diagram)
```
[ المستخدم ] ---> (المنفذ 80) ---> [ سيرفر التطبيق Server B ]
                                            |
                                      (المنفذ 3306)
                                            v
                                 [ سيرفر قاعدة البيانات Server A ]
```

---

## الجزء الأول: إعداد خادم قاعدة البيانات (Server A - Database Server)

على السيرفر الأول (Server A) المخصص لقاعدة البيانات فقط:

### 1. تثبيت خادم MySQL:
قم بتحديث الحزم وتثبيت MySQL:
```bash
sudo apt update
sudo apt install mysql-server -y
```
تفعيل الخدمة:
```bash
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 2. السماح بالاتصالات الخارجية عبر الشبكة (مهم جداً):
افتراضياً، يقبل MySQL الاتصالات المحلية فقط (`127.0.0.1`). لكي يستطيع سيرفر التطبيق الاتصال به:
1. افتح ملف إعدادات MySQL المخصص للاتصال:
   ```bash
   sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
   ```
2. ابحث عن السطر التالي:
   ```ini
   bind-address = 127.0.0.1
   ```
3. قم بتغييره إلى `0.0.0.0` ليقبل الاتصالات عبر الشبكة:
   ```ini
   bind-address = 0.0.0.0
   ```
4. احفظ الملف (`Ctrl + O` ثم `Enter` ثم `Ctrl + X`)، وأعد تشغيل الخدمة لتطبيق التغيير:
   ```bash
   sudo systemctl restart mysql
   ```

### 3. إنشاء قاعدة البيانات والمستخدم بصلاحية الاتصال الخارجي:
ادخل إلى سطر أوامر MySQL:
```bash
sudo mysql
```

قم بتشغيل الأوامر التالية بالترتيب. 
> [!IMPORTANT]
> استبدل `APP_SERVER_IP` بالـ IP الحقيقي الخاص بسيرفر التطبيق (Server B)، واستبدل `YourStrongPassword` بكلمة مرور قوية جداً:

```sql
-- 1. إنشاء قاعدة البيانات
CREATE DATABASE emacro_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. إنشاء مستخدم مخصص للاتصال من الـ IP الخاص بسيرفر التطبيق فقط لقوة الأمان
CREATE USER 'emacro_user'@'APP_SERVER_IP' IDENTIFIED BY 'YourStrongPassword';

-- 3. إعطاء هذا المستخدم الصلاحيات الكاملة على قاعدة بيانات النظام
GRANT ALL PRIVILEGES ON emacro_dashboard.* TO 'emacro_user'@'APP_SERVER_IP';

-- 4. تطبيق التغييرات فوراً
FLUSH PRIVILEGES;

-- 5. الخروج من MySQL
EXIT;
```
*(ملاحظة: إذا كنت تريد السماح للمستخدم بالاتصال من أي سيرفر بشكل عام، يمكنك استخدام `'emacro_user'@'%'` بدلاً من تحديد الـ IP).*

### 4. فتح منفذ قاعدة البيانات بالجدار الناري (Firewall):
تأكد من السماح بالاتصال الخارجي عبر المنفذ `3306` من سيرفر التطبيق (Server B):
```bash
sudo ufw allow from APP_SERVER_IP to any port 3306
```

---

## الجزء الثاني: إعداد خادم التطبيق (Server B - Application Server)

على السيرفر الثاني (Server B) المخصص لتشغيل التطبيق:

### 1. تثبيت Node.js ومدير العمليات PM2 وخادم Nginx:
```bash
sudo apt update
sudo apt install nodejs npm nginx -y
sudo npm install -g pm2
```

### 2. ضبط المتغيرات البيئية للاتصال بالسيرفر الآخر:
في مجلد المشروع، قم بإنشاء ملف `.env.local` واكتب بيانات الاتصال بسيرفر قاعدة البيانات (Server A):
```env
# استبدل DB_SERVER_IP بـ IP خادم قاعدة البيانات وسجل كلمة المرور الصحيحة
DATABASE_URL=mysql://emacro_user:YourStrongPassword@DB_SERVER_IP:3306/emacro_dashboard
PORT=3000
NODE_ENV=production
```

### 3. فحص الاتصال وبناء التطبيق والتشغيل:
1. قم بتثبيت المكتبات:
   ```bash
   npm install
   ```
2. فحص الاتصال الخارجي والتأكد من نجاح بناء الجداول تلقائياً:
   ```bash
   node emacro_db_check.js
   ```
3. بناء نسخة الإنتاج:
   ```bash
   npm run build
   ```
4. تشغيل التطبيق بالخلفية وحفظ العملية:
   ```bash
   pm2 start npm --name "workflow-system" -- start
   pm2 startup
   pm2 save
   ```

### 4. إعداد خادم Nginx كـ Reverse Proxy:
قم بإعداده لاستقبال الطلبات على المنفذ 80 وتوجيهها داخلياً إلى منفذ 3000 للمستخدمين كما هو موضح بالدليل الأساسي.
