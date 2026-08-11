# 🤖 AGENTS.md — Macro Workflow System
## دليل الذكاء الاصطناعي — اقرأ هذا قبل أي تعديل

> **⚠️ قاعدة ذهبية:** هذا النظام يعتمد بالكامل على **MySQL Direct Engine** (`src/lib/db/mysqlClient.ts`) كقاعدة بيانات وحيدة (`emacro_dashboard`).
> لا تكتب بيانات مؤقتة بملفات محلية. لا تستخدم localStorage. جميع الاستعلامات تمر عبر `mysqlClient.ts`.

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
MySQL Client    (src/lib/db/mysqlClient.ts)
        |
        v
MySQL Database (emacro_dashboard)
```

---

## الجداول في MySQL — المرجع الكامل (23 جدول)

### نواة سير العمل (Workflow Engine)
| Table | الوصف |
|-----------|--------|
| `workflows` | قوالب سير العمل (نماذج الطلبات) |
| `tickets` | طلبات المستخدمين (الحالات المفتوحة) |
| `ticket_values` | قيم حقول النماذج المرفقة بالطلبات |
| `ticket_observers` | مراقبو الطلبات |
| `ticket_assignees` | المكلفون بالطلبات |
| `ticket_comments` | التعليقات على الطلبات |
| `approval_log` | سجل قرارات الموافقة/الرفض |

### الهيكل التنظيمي (IAM)
| Table | الوصف |
|-----------|--------|
| `system_users` | موظفو الشركة (مستخدمو النظام) |
| `departments` | الادارات والاقسام |
| `business_groups` | المجموعات والفرق |
| `system_user_groups` | ربط المستخدمين بالمجموعات (Junction Table) |
| `role_permissions` | صلاحيات الأدوار |

### اللوائح والسياسات (Policies)
| Table | الوصف |
|-----------|--------|
| `policies` | لوائح الادارات |
| `policy_travel_rates` | أسعار بدلات الانتقال حسب المناطق |
| `travel_zones` | المناطق المعتمدة للتنقلات |
| `budgets` | الميزانيات الدورية للادارات |

### النظام والإعدادات (System)
| Table | الوصف |
|-----------|--------|
| `system_settings` | اعدادات النظام (key-value) |
| `notifications` | إشعارات المستخدمين |
| `external_api_endpoints` | نقاط اتصال الـ APIs الخارجية |

### محرك القواعد والمحاكاة (Rules & Simulation)
| Table | الوصف |
|-----------|--------|
| `business_rules` | قواعد العمل التلقائية |
| `rule_criteria` | شروط تطبيق القواعد |
| `rule_actions` | الإجراءات المترتبة على القواعد |
| `workflow_simulations` | محاكاة سير العمل |

---

## قواعد صارمة للذكاء الاصطناعي

### ممنوع تماماً:
1. **لا hardcoded data** - لا تكتب بيانات مستخدمين او ادارات او اعدادات في الكود
2. **لا localStorage** - لا تستخدم localStorage.setItem/getItem لحفظ بيانات العمليات
3. **لا collections جديدة بدون توثيق** - اي جدول جديد يجب توثيقه في هذا الملف
4. **لا fetch مباشر** - استخدم MySQL queries عبر `mysqlClient.ts` فقط

### القواعد الصحيحة:
1. **كل CRUD يمر بـ workflowActions.ts** - Server Actions هي البوابة الوحيدة للـ Backend
2. **البيانات المرجعية تُجلب من MySQL دائماً**
3. **AuthGuard في كل صفحة محمية**
4. **جميع أسماء الجداول بـ snake_case** - لا تستخدم PascalCase

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

*آخر تحديث: 2026-08-11 | النظام: Macro Workflow System v3.0 (MySQL-native)*
