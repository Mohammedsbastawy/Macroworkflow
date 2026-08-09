# 🤖 AGENTS.md — Macro Workflow System
## دليل الذكاء الاصطناعي — اقرأ هذا قبل أي تعديل

> **⚠️ قاعدة ذهبية:** هذا النظام يعتمد بالكامل على **MySQL** كقاعدة بيانات وحيدة.
> لا تكتب بيانات في الكود (hardcoded). لا تستخدم localStorage.

---

## معمارية النظام

```
Browser / Next.js App
        |
        v
Server Actions  (src/app/actions/workflowActions.ts)
        |
        v
Core Engine     (src/lib/engine/workflowCore.ts)
        |
        v
MySQL Database (Direct SQL/ORM)
```

---

## الجداول في MySQL — المرجع الكامل

### نواة سير العمل (Workflow Engine)
| Table | الوصف |
|-----------|--------|
| Workflows | قوالب سير العمل (نماذج الطلبات) |
| Tickets | طلبات المستخدمين (الحالات المفتوحة) |
| ApprovalLog | سجل قرارات الموافقة/الرفض |
| TicketValues | قيم حقول النماذج المرفقة بالطلبات |

### الهيكل التنظيمي (IAM)
| Table | الوصف |
|-----------|--------|
| Departments | الادارات والاقسام |
| Users | موظفو الشركة (مستخدمو النظام) |
| BusinessGroups | المجموعات والفرق |

### اللوائح والسياسات (Policies)
| Table | الوصف |
|-----------|--------|
| Policies | لوائح الادارات |
| TravelZones | المناطق المعتمدة للتنقلات |
| Budgets | الميزانيات الدورية للادارات |
| SystemSettings | اعدادات النظام (key-value) |

---

## قواعد صارمة للذكاء الاصطناعي

### ممنوع تماماً:
1. **لا hardcoded data** - لا تكتب بيانات مستخدمين او ادارات او اعدادات في الكود
2. **لا localStorage** - لا تستخدم localStorage.setItem/getItem لحفظ بيانات العمليات
3. **لا collections جديدة بدون توثيق** - اي جدول جديد يجب توثيقه في هذا الملف
4. **لا fetch مباشر** - استخدم MySQL queries/ORM فقط

### القواعد الصحيحة:
1. **كل CRUD يمر بـ workflowActions.ts** - Server Actions هي البوابة الوحيدة للـ Backend
2. **البيانات المرجعية تُجلب من MySQL دائماً**
3. **AuthGuard في كل صفحة محمية**

---

## متغيرات البيئة (.env.local)

```
DATABASE_URL=mysql://emacro:emacro123@localhost:3306/emacro_dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_SECRET=
```

---

## كيفية اضافة Feature جديدة

1. حدد الجدول - هل تحتاج جديد ام تضيف على موجود؟
2. انشئ Migration في database/migrations/
3. اضف Server Action في workflowActions.ts
4. وثّق في AGENTS.md
5. لا تضف بيانات في الكود - اعمل seed عبر ملفات SQL أو scripts/

---

*آخر تحديث: 2026-08-08 | النظام: Macro Workflow System v3.0 (MySQL-native)*
