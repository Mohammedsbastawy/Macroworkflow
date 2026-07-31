# 🤖 AGENTS.md — Macro Workflow System
## دليل الذكاء الاصطناعي — اقرأ هذا قبل أي تعديل

> **⚠️ قاعدة ذهبية:** هذا النظام يعتمد بالكامل على **Directus** كقاعدة بيانات وحيدة.
> لا تكتب بيانات في الكود (hardcoded). لا تستخدم localStorage. لا تنشئ جداول جديدة خارج Directus.

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
Directus Client (src/lib/directus/client.ts)
        |
        v
Directus REST API  --->  MySQL Database
  http://localhost:8055
  Token: workflow-engine-admin-static-token-2026
```

---

## Collections في Directus — المرجع الكامل

### نواة سير العمل (Workflow Engine)
| Collection | الوصف | المفتاح الأساسي |
|-----------|--------|----------------|
| workflows | قوالب سير العمل (نماذج الطلبات) | id (string) |
| tickets | طلبات المستخدمين (الحالات المفتوحة) | id (string) |
| approval_log | سجل قرارات الموافقة/الرفض | id (string) |
| ticket_values | قيم حقول النماذج المرفقة بالطلبات | id (string) |
| ticket_tasks | مهام فرعية داخل التذكرة | id (string) |
| ticket_sla_logs | سجل خروقات SLA | id (string) |

### الهيكل التنظيمي (IAM)
| Collection | الوصف | المفتاح الأساسي |
|-----------|--------|----------------|
| departments | الادارات والاقسام | id (string, e.g. dept-it) |
| system_users | موظفو الشركة (مستخدمو النظام) | id (string, e.g. user-ahmed) |
| business_groups | المجموعات والفرق | id (string, e.g. group-procurement) |
| role_permissions | صلاحيات كل دور | id (string) |

### اللوائح والسياسات (Policies)
| Collection | الوصف | المفتاح الأساسي |
|-----------|--------|----------------|
| policies | لوائح الادارات (rules_json بداخلها) | id (string) |
| travel_zones | المناطق المعتمدة للتنقلات (109 منطقة) | id (string, e.g. zone-43) |
| budgets | الميزانيات الدورية للادارات | id (string) |
| system_settings | اعدادات النظام (key-value) | key (string) |

### محرك القواعد (Rules Engine)
| Collection | الوصف | المفتاح الأساسي |
|-----------|--------|----------------|
| business_rules | قواعد الاتمتة GLPI-style | id (string) |
| rule_criteria | شروط القاعدة | id (string) |
| rule_actions | اجراءات القاعدة | id (string) |

### التوثيق وصياغة المستندات
| Collection | الوصف |
|-----------|--------|
| doctype_definitions | تعريفات انواع المستندات |
| doctype_fields | حقول كل نوع مستند |
| external_api_endpoints | نقاط API الخارجية للتكاملات |
| comments | تعليقات على التذاكر |
| alerts | تنبيهات النظام |

---

## هيكل الملفات

```
workflow-engine/
├── src/
│   ├── app/
│   │   ├── actions/
│   │   │   └── workflowActions.ts      <- كل Server Actions (Gateway الوحيد للـ Backend)
│   │   ├── admin/
│   │   │   ├── policies/page.tsx       <- ادارة اللوائح وتعريف المناطق
│   │   │   ├── profiles/page.tsx       <- ادارة المستخدمين والصلاحيات
│   │   │   ├── rules/page.tsx          <- محرك القواعد (GLPI-style)
│   │   │   ├── settings/page.tsx       <- اعدادات النظام
│   │   │   └── builder/               <- مصمم Workflow المرئي
│   │   ├── requests/                  <- تقديم طلبات جديدة
│   │   ├── approvals/                 <- قائمة الموافقات المعلقة
│   │   └── tickets/                   <- عرض وادارة التذاكر
│   ├── lib/
│   │   ├── directus/
│   │   │   ├── client.ts              <- Directus REST API helpers
│   │   │   └── iamDirectus.ts         <- IAM role sync مع Directus
│   │   └── engine/
│   │       ├── workflowCore.ts        <- Business Logic للـ Workflow Engine
│   │       ├── store.ts               <- TypeScript interfaces + normalize functions
│   │       └── iamStore.ts            <- TypeScript interfaces ONLY (لا بيانات مبرمجة)
│   └── types/
│       └── workflow.ts                <- TypeScript types للنظام
├── database/
│   └── schema_init.sql                <- SQL Schema مرجعي (للتوثيق فقط - لا تعدله)
└── AGENTS.md                          <- هذا الملف - اقرأه اولاً
```

---

## Directus Client API

الملف: `src/lib/directus/client.ts`

```typescript
// اجلب قائمة (مع فلترة اختيارية)
directusGet(collection, filter?, sort?, limit?)

// اجلب سجل واحد بالـ ID
directusGetOne(collection, id)

// انشئ سجل جديد
directusCreate<T>(collection, data)

// عدّل سجل موجود
directusUpdate(collection, id, data)

// احذف سجل
directusDelete(collection, id)
```

---

## قواعد صارمة للذكاء الاصطناعي

### ممنوع تماماً:
1. **لا hardcoded data** - لا تكتب بيانات مستخدمين او ادارات او اعدادات في الكود
2. **لا localStorage** - لا تستخدم localStorage.setItem/getItem لحفظ بيانات العمليات
3. **لا fallback بيانات** - لو Directus رجع error، ارجع [] او null واظهر رسالة خطأ
4. **لا collections جديدة بدون توثيق** - اي collection جديد يجب توثيقه في هذا الملف
5. **لا fetch مباشر** - لا تستخدم fetch() مباشرة. استخدم directusGet/directusCreate فقط
6. **لا تعديل schema_init.sql** - هذا ملف توثيق تاريخي فقط

### القواعد الصحيحة:
1. **كل CRUD يمر بـ workflowActions.ts** - Server Actions هي البوابة الوحيدة
2. **البيانات المرجعية تُجلب من Directus دائماً**
3. **AuthGuard في كل صفحة محمية**
4. **لو في collection جديد، انشئه في Directus عبر POST /collections API**

---

## IAM - نظام المستخدمين

### system_users (في Directus):
- **id format:** user-{name} مثل user-ahmed, user-mona
- **roles:** admin | approver | standard
- **direct_manager_id:** يشير لـ id مستخدم آخر

### departments (في Directus):
- **id format:** dept-{code} مثل dept-it, dept-mkt
- **parent_department_id:** للهيكل الشجري (null للجذر)

### business_groups (في Directus):
- **id format:** group-{name} مثل group-managers
- **member_user_ids_json:** مصفوفة JSON من user IDs

### الادارات المتاحة:
| id | الاسم |
|----|------|
| dept-exec | Executive Board & CEO Office |
| dept-it | IT & Technology Department |
| dept-hr | Human Resources (HR) |
| dept-finance | Finance & Accounts Department |
| dept-procurement | Procurement Department |
| dept-ops | Operations & Facilities |
| dept-mkt | Marketing & Digital Branding Department |

### المستخدمون الاساسيون:
| id | الاسم | الدور | الادارة |
|----|------|-------|---------|
| user-admin | System Admin | admin | dept-it |
| user-khaled | Khaled Samir | approver | dept-it |
| user-ahmed | Ahmed Mohamed | standard | dept-it |
| user-mona | Mona Omar (CFO) | approver | dept-finance |
| user-huda | Huda Adel | standard | dept-finance |
| user-sara | Sara Hassan | approver | dept-hr |
| user-laila | Laila Ibrahim | standard | dept-hr |
| user-sherif | Sherif Ramzy | approver | dept-mkt |
| user-noha | Noha Gamal | standard | dept-mkt |
| user-omar | Omar Khaled | standard | dept-mkt |
| user-yasser | Yasser Mahmoud | approver | dept-procurement |
| user-tarek | Tarek Hassan | standard | dept-procurement |
| user-karim | Karim Fathy | approver | dept-ops |

---

## دورة حياة الطلب (Request Lifecycle)

```
1. المستخدم يختار Workflow من الكتالوج
2. يملأ النموذج (fields_json في الـ workflow)
3. submitRequest() -> ينشئ ticket في Directus (status: pending)
4. يُخطر المعتمد الاول (current_assignees_json)
5. المعتمد يوافق/يرفض -> processApprovalAction()
6. approval_log يُسجل القرار
7. لو موافق -> الطلب ينتقل للخطوة التالية
8. لو وصل للنهاية -> status: approved/rejected
```

---

## نموذج بيانات اللوائح (Policies Data Model)

```typescript
// في policies collection
{
  id: string,            // 'pol-{timestamp}'
  name: string,          // اسم اللائحة
  department_id: string, // يشير لـ departments collection
  is_active: boolean,
  rules_json: PolicyRule[]
}

// نوع 1 - قاعدة شرطية (condition_rule):
{
  rule_type: 'condition_rule',
  condition_field: string,    // e.g. 'form.amount'
  condition_operator: string, // '>' | '<' | '==' | ...
  condition_value: string,
  action_type: 'block_submission' | 'warning_banner' | 'require_approval',
  error_message_ar: string
}

// نوع 2 - جدول مصاريف التنقلات (marketing_matrix):
{
  rule_type: 'marketing_matrix',
  matrix_rows: [{
    zone_from: string,             // اسم المنطقة من travel_zones
    zone_to: string,
    transport_allowance: number,   // بدل المواصلات (ج.م)
    meal_price: number,            // الوجبة (ج.م)
    meal_overnight_price: number   // وجبة بمبيت (ج.م)
  }]
}
```

---

## متغيرات البيئة (.env.local)

```
DIRECTUS_URL=http://localhost:8055
DIRECTUS_TOKEN=workflow-engine-admin-static-token-2026
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## كيفية اضافة Feature جديدة

1. حدد الـ collection - هل تحتاج جديد ام تضيف على موجود؟
2. انشئ في Directus عبر POST /collections API بالـ token
3. اضف Server Action في workflowActions.ts
4. وثّق في AGENTS.md - اضف الـ collection في جدول Collections
5. لا تضف بيانات في الكود - اعمل seed عبر Directus API او Admin Panel

---

*آخر تحديث: 2026-07-28 | النظام: Macro Workflow System v2.0*
