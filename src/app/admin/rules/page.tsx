"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  fetchBusinessRulesAction,
  saveBusinessRuleAction,
  deleteBusinessRuleAction,
  fetchCatalogWorkflowsAction,
} from "@/app/actions/workflowActions";
import { AuthGuard } from "@/components/auth/AuthGuard";

interface RuleCriteria {
  id?: string;
  field: string;
  operator: string;
  value: string;
}

interface RuleAction {
  id?: string;
  action_type: string;
  target_value: string;
  execution_order?: number;
}

interface BusinessRule {
  id?: string;
  name: string;
  description: string;
  is_active: boolean;
  execution_order: number;
  match_type: "AND" | "OR";
  stop_on_match: boolean;
  criteria: RuleCriteria[];
  actions: RuleAction[];
}

const FIELD_OPTIONS = [
  // 1. Core Info & Form Catalog
  { value: "workflow_slug", labelEn: "📄 Requests Catalog Form (استمارة طلب من الكتالوج)", labelAr: "📄 استمارة طلب من الكتالوج (Catalog Form)" },
  { value: "type", labelEn: "🏷️ Ticket Type (نوع التذكرة: Incident vs Request)", labelAr: "🏷️ نوع التذكرة (Incident عطل أم Request طلب)" },

  // 2. Classification & Priority Matrix
  { value: "category_id", labelEn: "📂 Main Category (التصنيف الرئيسي)", labelAr: "📂 التصنيف الرئيسي (Category)" },
  { value: "subcategory_id", labelEn: "📁 Subcategory (التصنيف الفرعي)", labelAr: "📁 التصنيف الفرعي (Subcategory)" },
  { value: "priority", labelEn: "🚩 Priority Level (درجة الأولوية)", labelAr: "🚩 درجة الأولوية (Priority)" },
  { value: "impact", labelEn: "💥 Impact Level (مستوى التأثير)", labelAr: "💥 مستوى التأثير (Impact)" },
  { value: "urgency", labelEn: "⚡ Urgency Level (درجة الاستعجال)", labelAr: "⚡ درجة الاستعجال (Urgency)" },
  { value: "location_id", labelEn: "📍 Location / Branch (الموقع الإقليمي/الفرع)", labelAr: "📍 الموقع أو الفرع (Location)" },
  { value: "total_amount", labelEn: "💰 Total Amount/Cost (التكلفة الإجمالية)", labelAr: "💰 التكلفة الإجمالية (Amount)" },

  // 3. Actors & Assignments
  { value: "requester_group", labelEn: "👥 Requester Group (مجموعة الموظف)", labelAr: "👥 مجموعة الموظف (Group)" },
  { value: "requester_department", labelEn: "🏢 Requester Department (إدارة الموظف)", labelAr: "🏢 إدارة الموظف (Department)" },
  { value: "assigned_group", labelEn: "🛠️ Assigned Group (الفريق المسؤول)", labelAr: "🛠️ الفريق المسؤول عن الحل" },
  { value: "assigned_user", labelEn: "👤 Assigned Employee (الموظف المسند له)", labelAr: "👤 الموظف المسند له الطلب" },
  { value: "observer_id", labelEn: "👁️ Observer / Watcher (المُتابع CC)", labelAr: "👁️ المُتابع المنسوخ (Watcher)" },

  // 4. Lifecycle & State
  { value: "status", labelEn: "🔄 Ticket Status (حالة التذكرة)", labelAr: "🔄 حالة التذكرة (Status)" },
  { value: "pending_reason", labelEn: "⏳ Pending Reason (سبب تعليق التذكرة)", labelAr: "⏳ سبب تعليق التذكرة (Pending Reason)" },

  // 5. Approvals & Time
  { value: "approval_status", labelEn: "🛡️ Approval Status (حالة الاعتماد)", labelAr: "🛡️ حالة الاعتماد (Approval Status)" },
  { value: "solution_type", labelEn: "✅ Solution Type (نوع الحل)", labelAr: "✅ نوع الحل والإغلاق (Solution Type)" },
];

const OPERATOR_OPTIONS = [
  { value: "equals", labelEn: "is equal to (=)", labelAr: "يساوي (=)" },
  { value: "not_equals", labelEn: "is not equal to (≠)", labelAr: "لا يساوي (≠)" },
  { value: "contains", labelEn: "contains text", labelAr: "يحتوي على نص" },
  { value: "in", labelEn: "is in list (comma separated)", labelAr: "ضمن قائمة" },
  { value: "greater_than", labelEn: "is greater than (>)", labelAr: "أكبر من (>)" },
];

const ACTION_TYPES = [
  { value: "assign_group", labelEn: "👥 Assign to Group (توجيه لمجموعة)", labelAr: "👥 توجيه لمجموعة عمل" },
  { value: "assign_user", labelEn: "👤 Assign to Specific User/Tech (توجيه لفني/مستخدم)", labelAr: "👤 توجيه لفني أو موظف معين" },
  { value: "set_observer", labelEn: "👁️ Set Observer / CC (إضافة متابع للتذكرة)", labelAr: "👁️ إشراك متابع (CC Observer)" },
  { value: "set_priority", labelEn: "🚩 Set Priority Level (تغيير الأولوية)", labelAr: "🚩 تغيير درجة الأولوية" },
  { value: "set_status", labelEn: "🔄 Set Ticket Status (تغيير حالة التذكرة)", labelAr: "🔄 تغيير حالة التذكرة (Status)" },
  { value: "set_pending_reason", labelEn: "⏳ Set Pending Reason (تدوين سبب التعليق)", labelAr: "⏳ تدوين سبب تعليق التذكرة" },
  { value: "attach_sla_tto", labelEn: "⏱️ Attach SLA TTO (Time To Own - الاستلام)", labelAr: "⏱️ ربط SLA TTO (زمن الاستلام)" },
  { value: "attach_sla_ttr", labelEn: "⏱️ Attach SLA TTR (Time To Resolve - الحل)", labelAr: "⏱️ ربط SLA TTR (زمن الحل الإجمالي)" },
  { value: "attach_ola", labelEn: "⏱️ Attach Internal OLA Timer (مؤقت OLA الداخلي)", labelAr: "⏱️ ربط مؤقت OLA الداخلي" },
  { value: "require_approval", labelEn: "🛡️ Require Approval Role (طلب اعتماد)", labelAr: "🛡️ طلب اعتماد من دور معين" },
  { value: "set_solution", labelEn: "✅ Record Solution Type (تدوين نوع الحل)", labelAr: "✅ تدوين نوع الحل الإغلاقي" },
];

const GROUP_TARGETS = [
  { value: "IT_MANAGERS", labelEn: "IT Managers Group", labelAr: "مديري تكنولوجيا المعلومات" },
  { value: "FINANCE_DEPT", labelEn: "Finance Department", labelAr: "الإدارة المالية" },
  { value: "HR_DIRECTORS", labelEn: "HR Directors Committee", labelAr: "لجنة الموارد البشرية" },
  { value: "EXEC_BOARD", labelEn: "Executive Board", labelAr: "مجلس الإدارة التنفيذي" },
  { value: "PROCUREMENT_TEAM", labelEn: "Procurement Team", labelAr: "فريق المشتريات" },
];

const PRIORITY_TARGETS = [
  { value: "low", labelEn: "Low (منخفض)", labelAr: "منخفض" },
  { value: "normal", labelEn: "Normal (عادي)", labelAr: "عادي" },
  { value: "high", labelEn: "High (عالي)", labelAr: "عالي" },
  { value: "urgent", labelEn: "Urgent (عاجل طارئ)", labelAr: "عاجل طارئ" },
  { value: "critical", labelEn: "Critical (حرج للغاية)", labelAr: "حرج للغاية" },
];

const STATUS_TARGETS = [
  { value: "new", labelEn: "New (جديدة)", labelAr: "جديدة" },
  { value: "assigned", labelEn: "Assigned (مُسندة)", labelAr: "مُسندة لجروب/فني" },
  { value: "planned", labelEn: "Planned (مُجدولة)", labelAr: "مُجدولة" },
  { value: "pending", labelEn: "Pending (معلقة)", labelAr: "معلقة (Pending)" },
  { value: "solved", labelEn: "Solved (محلولة)", labelAr: "محلولة" },
  { value: "closed", labelEn: "Closed (مغلقة)", labelAr: "مغلقة نهائياً" },
];

const PENDING_REASON_TARGETS = [
  { value: "wait_approval", labelEn: "Wait Approval (انتظار موافقة)", labelAr: "انتظار موافقة" },
  { value: "wait_spare_part", labelEn: "Wait Spare Part (انتظار قطعة غيار)", labelAr: "انتظار قطعة غيار" },
  { value: "wait_requester", labelEn: "Wait Requester Reply (انتظار رد الموظف)", labelAr: "انتظار رد الموظف" },
];

const SLA_TTO_TARGETS = [
  { value: "15_MIN", labelEn: "15 Minutes (TTO Fast Response)", labelAr: "15 دقيقة (استلام سريع)" },
  { value: "1_HOUR", labelEn: "1 Hour (TTO Normal)", labelAr: "ساعة واحدة (استلام عادي)" },
  { value: "4_HOURS", labelEn: "4 Hours (TTO Standard)", labelAr: "4 ساعات (استلام قياسي)" },
];

const SLA_TTR_TARGETS = [
  { value: "2_HOURS", labelEn: "2 Hours TTR (Resolution)", labelAr: "ساعتان (حل طارئ)" },
  { value: "8_HOURS", labelEn: "8 Hours TTR (Resolution)", labelAr: "8 ساعات (حل قياسي)" },
  { value: "24_HOURS", labelEn: "24 Hours TTR (Resolution)", labelAr: "24 ساعة (حل يومي)" },
  { value: "48_HOURS", labelEn: "48 Hours TTR (Resolution)", labelAr: "48 ساعة (حل عادي)" },
];

const SOLUTION_TARGETS = [
  { value: "repaired", labelEn: "Repaired / Fixed (تم الإصلاح)", labelAr: "تم الإصلاح" },
  { value: "replaced", labelEn: "Replaced Hardware (تم الاستبدال)", labelAr: "تم الاستبدال" },
  { value: "rejected_policy", labelEn: "Rejected (مرفوض حسب السياسة)", labelAr: "مرفوض حسب السياسة" },
  { value: "duplicate", labelEn: "Duplicate Request (مشكلة متكررة)", labelAr: "مشكلة متكررة" },
];

const OLA_TARGETS = [
  { value: "2_HOURS", labelEn: "2 Hours (ساعتان)", labelAr: "ساعتان (2h)" },
  { value: "4_HOURS", labelEn: "4 Hours (4 ساعات)", labelAr: "4 ساعات (4h)" },
  { value: "8_HOURS", labelEn: "8 Hours (8 ساعات)", labelAr: "8 ساعات (8h)" },
  { value: "24_HOURS", labelEn: "24 Hours (يوم واحد)", labelAr: "24 ساعة (يوم)" },
  { value: "48_HOURS", labelEn: "48 Hours (يومان)", labelAr: "48 ساعة (يومان)" },
];

export default function BusinessRulesManagerPage() {
  const { lang } = useLanguage();
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Drawer state for Create or Edit
  const [showModal, setShowModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [executionOrder, setExecutionOrder] = useState(10);
  const [matchType, setMatchType] = useState<"AND" | "OR">("AND");
  const [stopOnMatch, setStopOnMatch] = useState(true);
  const [criteria, setCriteria] = useState<RuleCriteria[]>([
    { field: "category_id", operator: "equals", value: "Hardware" },
  ]);
  const [actions, setActions] = useState<RuleAction[]>([
    { action_type: "assign_group", target_value: "IT_MANAGERS" },
  ]);

  const [catalogForms, setCatalogForms] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await fetchBusinessRulesAction();
      setRules(data || []);
      const forms = await fetchCatalogWorkflowsAction();
      setCatalogForms(forms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const openCreateModal = () => {
    setEditingRuleId(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setExecutionOrder((rules.length + 1) * 10);
    setMatchType("AND");
    setStopOnMatch(true);
    setCriteria([{ field: "category_id", operator: "equals", value: "Hardware" }]);
    setActions([{ action_type: "assign_group", target_value: "IT_MANAGERS" }]);
    setShowModal(true);
  };

  const openEditModal = (rule: BusinessRule) => {
    setEditingRuleId(rule.id || null);
    setName(rule.name || "");
    setDescription(rule.description || "");
    setIsActive(rule.is_active ?? true);
    setExecutionOrder(rule.execution_order || 10);
    setMatchType(rule.match_type || "AND");
    setStopOnMatch(rule.stop_on_match ?? true);
    setCriteria(
      rule.criteria && rule.criteria.length > 0
        ? rule.criteria
        : [{ field: "category_id", operator: "equals", value: "" }]
    );
    setActions(
      rule.actions && rule.actions.length > 0
        ? rule.actions
        : [{ action_type: "assign_group", target_value: "" }]
    );
    setShowModal(true);
  };

  const handleAddCriteria = () => {
    setCriteria([...criteria, { field: "requester_group", operator: "equals", value: "VIP" }]);
  };

  const handleRemoveCriteria = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const handleCriteriaChange = (index: number, key: keyof RuleCriteria, val: string) => {
    const next = [...criteria];
    next[index] = { ...next[index], [key]: val };
    setCriteria(next);
  };

  const handleAddAction = () => {
    setActions([...actions, { action_type: "set_priority", target_value: "high" }]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleActionChange = (index: number, key: keyof RuleAction, val: string) => {
    const next = [...criteria];
    const nextActions = [...actions];
    nextActions[index] = { ...nextActions[index], [key]: val };
    // Set smart defaults when action_type changes
    if (key === "action_type") {
      if (val === "assign_group") nextActions[index].target_value = "IT_MANAGERS";
      else if (val === "set_priority") nextActions[index].target_value = "high";
      else if (val === "attach_ola") nextActions[index].target_value = "4_HOURS";
      else if (val === "require_approval") nextActions[index].target_value = "DIRECT_MANAGER";
    }
    setActions(nextActions);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert(lang === "ar" ? "يرجى كتابة اسم لقاعدة العمل أولاً!" : "Please enter a rule name first!");
      return;
    }
    setSaving(true);
    try {
      await saveBusinessRuleAction({
        id: editingRuleId || undefined,
        name,
        description,
        is_active: isActive,
        execution_order: executionOrder,
        match_type: matchType,
        stop_on_match: stopOnMatch,
        criteria,
        actions,
      });
      setShowModal(false);
      await loadRules();
    } catch (err) {
      alert("Error saving rule: " + err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm(lang === "ar" ? "هل أنت تأكيد من حذف قاعدة العمل هذه؟" : "Delete this business rule?")) return;
    try {
      await deleteBusinessRuleAction(id);
      await loadRules();
    } catch (err) {
      alert("Error deleting rule: " + err);
    }
  };

  return (
    <AuthGuard requiredModule="workflowBuilder" allowRoles={['admin', 'approver']}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {lang === "ar" ? "⚖️ محرك قواعد العمل الأوتوماتيكي (GLPI Business Rules)" : "⚖️ Business Rules Engine"}
          </h1>
          <p className="page-subtitle">
            {lang === "ar"
              ? "إدارة وتصنيف قواعد التوجيه الذكية والأولويات واتفاقيات الخدمة (Decoupled Event-Driven Automation)"
              : "Decoupled Event-Driven Business Rules Engine for Automated Ticket Routing & OLA SLAs"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          {lang === "ar" ? "＋ إنشاء قاعدة عمل جديدة" : "＋ Create New Rule"}
        </button>
      </div>

      {/* Rules Directory Table / Cards */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
          {lang === "ar" ? "جاري تحميل قواعد العمل من database..." : "Loading Business Rules from database..."}
        </div>
      ) : rules.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: "60px 20px" }}>
            <div className="empty-state-icon">⚖️</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--color-text-primary)" }}>
              {lang === "ar" ? "لا توجد قواعد عمل مسجلة حتى الآن" : "No Business Rules Defined Yet"}
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 6, maxWidth: 500 }}>
              {lang === "ar"
                ? "يمكنك إضافة قواعد جديدة لتوجيه الطلبات تلقائياً بناءً على نوع الطلب، التكلفة، أو الهيكل التنظيمي."
                : "Create event-driven rules to dynamically route tickets based on metadata like category, cost, or requester group."}
            </p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreateModal}>
              {lang === "ar" ? "＋ إنشاء أول قاعدة عمل" : "＋ Create First Rule"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="card"
              style={{
                borderLeft: `5px solid ${rule.is_active ? "var(--color-primary)" : "var(--color-text-muted)"}`,
                opacity: rule.is_active ? 1 : 0.7,
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--color-text-primary)" }}>
                      {rule.name}
                    </h3>
                    <span className={`badge ${rule.is_active ? "success" : "secondary"}`} style={{ fontSize: 11, fontWeight: 700 }}>
                      {rule.is_active ? (lang === "ar" ? "نشط ● Active" : "Active ●") : lang === "ar" ? "معطل" : "Disabled"}
                    </span>
                    <span className="tag" style={{ fontSize: 11, background: "var(--color-primary-light)", color: "var(--color-primary)", fontWeight: 700 }}>
                      {lang === "ar" ? `أولوية التنفيذ: #${rule.execution_order}` : `Priority Order: #${rule.execution_order}`}
                    </span>
                    <span className="tag info" style={{ fontSize: 11 }}>
                      Logic: <strong>{rule.match_type}</strong> {rule.stop_on_match && "(Stop on Match)"}
                    </span>
                  </div>
                  {rule.description && (
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 6, margin: 0 }}>
                      {rule.description}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => openEditModal(rule)}>
                    ✏️ {lang === "ar" ? "تعديل" : "Edit"}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--color-danger)" }} onClick={() => handleDeleteRule(rule.id!)}>
                    🗑️ {lang === "ar" ? "حذف" : "Delete"}
                  </button>
                </div>
              </div>

              {/* Criteria & Actions Dual Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
                {/* Criteria Column */}
                <div style={{ background: "rgba(79, 70, 229, 0.04)", border: "1px solid rgba(79, 70, 229, 0.15)", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>🔍</span> {lang === "ar" ? "شروط التطابق (IF Criteria):" : "IF Ticket Criteria Matches:"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {rule.criteria && rule.criteria.length > 0 ? (
                      rule.criteria.map((c, idx) => (
                        <div key={idx} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface)", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
                          <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>{c.field}</span>
                          <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>{c.operator}</span>
                          <span className="badge info" style={{ fontSize: 11, fontWeight: 700 }}>"{c.value}"</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No criteria defined</span>
                    )}
                  </div>
                </div>

                {/* Actions Column */}
                <div style={{ background: "rgba(16, 185, 129, 0.04)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>⚡</span> {lang === "ar" ? "الإجراءات الأوتوماتيكية (THEN Actions):" : "THEN Execute Actions:"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {rule.actions && rule.actions.length > 0 ? (
                      rule.actions.map((a, idx) => (
                        <div key={idx} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface)", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
                          <span style={{ fontWeight: 700, color: "#10B981" }}>{a.action_type}</span>
                          <span style={{ color: "var(--color-text-muted)" }}>➔</span>
                          <span className="badge success" style={{ fontSize: 11, fontWeight: 700 }}>"{a.target_value}"</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No actions defined</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enterprise High-End Rule Editor Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 860,
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              background: "var(--color-surface)",
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              overflow: "hidden",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* Sleek Modal Header Banner */}
            <div
              style={{
                padding: "20px 24px",
                background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)",
                color: "#FFFFFF",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: "rgba(255, 255, 255, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  ⚖️
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#FFFFFF" }}>
                    {editingRuleId
                      ? lang === "ar" ? "تعديل قاعدة العمل (Edit Rule)" : "Edit Business Rule"
                      : lang === "ar" ? "إنشاء قاعدة عمل جديدة (New Rule)" : "Create New Business Rule"}
                  </h2>
                  <p style={{ fontSize: 12, margin: 0, opacity: 0.85, marginTop: 2 }}>
                    {lang === "ar"
                      ? "إعداد قواعد التوجيه الذكي والشروط التلقائية (GLPI-Style Rule Automation)"
                      : "Define criteria conditions and target automated routing actions"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  border: "none",
                  color: "#FFFFFF",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveRule} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Basic Identity Inputs */}
                <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 16 }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>
                      {lang === "ar" ? "اسم قاعدة العمل (Rule Name)" : "Rule Name"} <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      className="form-control"
                      placeholder={lang === "ar" ? "مثال: توجيه طلبات الشراء الكبيرة للمدير المالي..." : "e.g. VIP Hardware Requests Routing Rule"}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{ fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>
                      {lang === "ar" ? "أولوية التنفيذ (Weight)" : "Execution Order"} <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={executionOrder}
                      onChange={(e) => setExecutionOrder(Number(e.target.value))}
                      required
                      style={{ fontSize: 13, fontWeight: 700 }}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>
                    {lang === "ar" ? "وصف القاعدة وهدفها التشغيلي (Description)" : "Rule Description"}
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder={lang === "ar" ? "توضيح الهدف من هذه القاعدة للفرق الأخرى..." : "e.g. Routes high cost equipment requests to CFO with 4h OLA"}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>

                {/* Match Control Panel Bar */}
                <div
                  style={{
                    display: "flex",
                    gap: 24,
                    alignItems: "center",
                    background: "var(--color-background)",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "var(--color-primary)" }}
                    />
                    <span>{lang === "ar" ? "تفعيل القاعدة (Enable Rule)" : "Rule Enabled"}</span>
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>{lang === "ar" ? "منطق التطابق:" : "Match Type:"}</span>
                    <select
                      className="form-control"
                      style={{ padding: "4px 10px", fontSize: 12, fontWeight: 700, width: 130 }}
                      value={matchType}
                      onChange={(e) => setMatchType(e.target.value as any)}
                    >
                      <option value="AND">ALL (AND)</option>
                      <option value="OR">ANY (OR)</option>
                    </select>
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={stopOnMatch}
                      onChange={(e) => setStopOnMatch(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "var(--color-primary)" }}
                    />
                    <span>{lang === "ar" ? "إيقاف التقييم عند التطابق (Stop on Match)" : "Stop on Match"}</span>
                  </label>
                </div>

                {/* ZONE 1: Criteria Builder Card */}
                <div
                  style={{
                    background: "rgba(79, 70, 229, 0.03)",
                    border: "1px solid rgba(79, 70, 229, 0.2)",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="badge primary" style={{ fontSize: 11, fontWeight: 800 }}>IF</span>
                      <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "var(--color-primary)" }}>
                        {lang === "ar" ? "شروط التطابق (Match Criteria)" : "Criteria Conditions"}
                      </h4>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handleAddCriteria}
                      style={{ fontSize: 12, borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
                    >
                      ＋ {lang === "ar" ? "إضافة شرط جديد" : "Add Condition"}
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {criteria.map((c, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1.5fr 2fr 36px",
                          gap: 10,
                          alignItems: "center",
                          background: "var(--color-surface)",
                          padding: 10,
                          borderRadius: 8,
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <div>
                          <select
                            className="form-control"
                            style={{ fontSize: 12, fontWeight: 600 }}
                            value={c.field}
                            onChange={(e) => handleCriteriaChange(idx, "field", e.target.value)}
                          >
                            {FIELD_OPTIONS.map((f) => (
                              <option key={f.value} value={f.value}>
                                {lang === "ar" ? f.labelAr : f.labelEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <select
                            className="form-control"
                            style={{ fontSize: 12 }}
                            value={c.operator}
                            onChange={(e) => handleCriteriaChange(idx, "operator", e.target.value)}
                          >
                            {OPERATOR_OPTIONS.map((op) => (
                              <option key={op.value} value={op.value}>
                                {lang === "ar" ? op.labelAr : op.labelEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          {c.field === "workflow_slug" ? (
                            <select
                              className="form-control"
                              style={{ fontSize: 12, fontWeight: 700 }}
                              value={c.value}
                              onChange={(e) => handleCriteriaChange(idx, "value", e.target.value)}
                            >
                              <option value="">{lang === "ar" ? "-- اختر استمارة الطلب --" : "-- Select Catalog Form --"}</option>
                              {catalogForms.map((form) => (
                                <option key={form.id || form.slug} value={form.slug || form.id}>
                                  📋 {form.name} ({form.category})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              className="form-control"
                              style={{ fontSize: 12 }}
                              placeholder={lang === "ar" ? "أدخل القيمة (مثال: Hardware أو VIP)" : "Enter value..."}
                              value={c.value}
                              onChange={(e) => handleCriteriaChange(idx, "value", e.target.value)}
                            />
                          )}
                        </div>

                        {criteria.length > 1 ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: "var(--color-danger)", padding: 0, height: 32, width: 32 }}
                            onClick={() => handleRemoveCriteria(idx)}
                            title="Remove condition"
                          >
                            ✕
                          </button>
                        ) : <div />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ZONE 2: Actions Builder Card */}
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.03)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="badge success" style={{ fontSize: 11, fontWeight: 800 }}>THEN</span>
                      <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "#10B981" }}>
                        {lang === "ar" ? "الإجراءات الأوتوماتيكية (Trigger Actions)" : "Trigger Actions"}
                      </h4>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handleAddAction}
                      style={{ fontSize: 12, borderColor: "#10B981", color: "#10B981" }}
                    >
                      ＋ {lang === "ar" ? "إضافة إجراء جديد" : "Add Action"}
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {actions.map((a, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 2.5fr 36px",
                          gap: 10,
                          alignItems: "center",
                          background: "var(--color-surface)",
                          padding: 10,
                          borderRadius: 8,
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <div>
                          <select
                            className="form-control"
                            style={{ fontSize: 12, fontWeight: 600 }}
                            value={a.action_type}
                            onChange={(e) => handleActionChange(idx, "action_type", e.target.value)}
                          >
                            {ACTION_TYPES.map((act) => (
                              <option key={act.value} value={act.value}>
                                {lang === "ar" ? act.labelAr : act.labelEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Contextual Target Value Selector based on Action Type */}
                        <div>
                          {a.action_type === "assign_group" ? (
                            <select
                              className="form-control"
                              style={{ fontSize: 12, fontWeight: 700 }}
                              value={a.target_value}
                              onChange={(e) => handleActionChange(idx, "target_value", e.target.value)}
                            >
                              {GROUP_TARGETS.map((g) => (
                                <option key={g.value} value={g.value}>
                                  {lang === "ar" ? g.labelAr : g.labelEn}
                                </option>
                              ))}
                            </select>
                          ) : a.action_type === "set_priority" ? (
                            <select
                              className="form-control"
                              style={{ fontSize: 12, fontWeight: 700 }}
                              value={a.target_value}
                              onChange={(e) => handleActionChange(idx, "target_value", e.target.value)}
                            >
                              {PRIORITY_TARGETS.map((p) => (
                                <option key={p.value} value={p.value}>
                                  {lang === "ar" ? p.labelAr : p.labelEn}
                                </option>
                              ))}
                            </select>
                          ) : a.action_type === "set_status" ? (
                            <select
                              className="form-control"
                              style={{ fontSize: 12, fontWeight: 700 }}
                              value={a.target_value}
                              onChange={(e) => handleActionChange(idx, "target_value", e.target.value)}
                            >
                              {STATUS_TARGETS.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {lang === "ar" ? s.labelAr : s.labelEn}
                                </option>
                              ))}
                            </select>
                          ) : a.action_type === "set_pending_reason" ? (
                            <select
                              className="form-control"
                              style={{ fontSize: 12, fontWeight: 700 }}
                              value={a.target_value}
                              onChange={(e) => handleActionChange(idx, "target_value", e.target.value)}
                            >
                              {PENDING_REASON_TARGETS.map((pr) => (
                                <option key={pr.value} value={pr.value}>
                                  {lang === "ar" ? pr.labelAr : pr.labelEn}
                                </option>
                              ))}
                            </select>
                          ) : a.action_type === "attach_sla_tto" ? (
                            <select
                              className="form-control"
                              style={{ fontSize: 12, fontWeight: 700 }}
                              value={a.target_value}
                              onChange={(e) => handleActionChange(idx, "target_value", e.target.value)}
                            >
                              {SLA_TTO_TARGETS.map((st) => (
                                <option key={st.value} value={st.value}>
                                  {lang === "ar" ? st.labelAr : st.labelEn}
                                </option>
                              ))}
                            </select>
                          ) : a.action_type === "attach_sla_ttr" ? (
                            <select
                              className="form-control"
                              style={{ fontSize: 12, fontWeight: 700 }}
                              value={a.target_value}
                              onChange={(e) => handleActionChange(idx, "target_value", e.target.value)}
                            >
                              {SLA_TTR_TARGETS.map((str) => (
                                <option key={str.value} value={str.value}>
                                  {lang === "ar" ? str.labelAr : str.labelEn}
                                </option>
                              ))}
                            </select>
                          ) : a.action_type === "set_solution" ? (
                            <select
                              className="form-control"
                              style={{ fontSize: 12, fontWeight: 700 }}
                              value={a.target_value}
                              onChange={(e) => handleActionChange(idx, "target_value", e.target.value)}
                            >
                              {SOLUTION_TARGETS.map((sol) => (
                                <option key={sol.value} value={sol.value}>
                                  {lang === "ar" ? sol.labelAr : sol.labelEn}
                                </option>
                              ))}
                            </select>
                          ) : a.action_type === "attach_ola" ? (
                            <select
                              className="form-control"
                              style={{ fontSize: 12, fontWeight: 700 }}
                              value={a.target_value}
                              onChange={(e) => handleActionChange(idx, "target_value", e.target.value)}
                            >
                              {OLA_TARGETS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {lang === "ar" ? o.labelAr : o.labelEn}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              className="form-control"
                              style={{ fontSize: 12 }}
                              placeholder={lang === "ar" ? "أدخل النتيجة (مثال: Ahmed Mohamed أو CC_OBSERVER)" : "Enter target value..."}
                              value={a.target_value}
                              onChange={(e) => handleActionChange(idx, "target_value", e.target.value)}
                            />
                          )}
                        </div>

                        {actions.length > 1 ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: "var(--color-danger)", padding: 0, height: 32, width: 32 }}
                            onClick={() => handleRemoveAction(idx)}
                            title="Remove action"
                          >
                            ✕
                          </button>
                        ) : <div />}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal Footer Controls */}
              <div
                style={{
                  padding: "16px 24px",
                  background: "var(--color-background)",
                  borderTop: "1px solid var(--color-border)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: "8px 24px" }} disabled={saving}>
                  {saving
                    ? lang === "ar" ? "جاري الحفظ..." : "Saving..."
                    : lang === "ar" ? "💾 حفظ قاعدة العمل" : "💾 Save Business Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}

