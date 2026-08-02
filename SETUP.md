# تشغيل المشروع محلياً

## 1. شغّل MySQL

```bash
docker run -d --name mysql-emacro -e MYSQL_ROOT_PASSWORD=root123 -e MYSQL_DATABASE=emacro_dashboard -e MYSQL_USER=emacro -e MYSQL_PASSWORD=emacro123 -p 3306:3306 mysql:8.0
```

## 2. نزل الاعتماديات

```bash
D:
cd D:\Macro Workflow System\workflow-engine
npm install
```

## 3. أنشئ الجداول في قاعدة البيانات

```bash
node emacro_db_check.js
```

## 4. شغّل المشروع

```bash
npm run dev
```

افتح: **http://localhost:3000**

---

### أوامر سريعة

| الأمر | الوظيفة |
|-------|---------|
| `npm run dev` | تشغيل التطوير |
| `npm run build` | بناء للإنتاج |
| `npm start` | تشغيل الإنتاج |

> **ملاحظة:** لو مش قادر تنتقل لـ D:\ من الـ CMD، اكتب `D:` الأول عشان تبدل الـ Drive، وبعدين `cd D:\Macro Workflow System\workflow-engine`
