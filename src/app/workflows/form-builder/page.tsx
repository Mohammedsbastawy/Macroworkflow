"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  createWorkflowFormAction,
  fetchCatalogWorkflowsAction,
  fetchOrgHierarchyAction,
  fetchBusinessGroupsAction,
  fetchSystemUsersAction,
  fetchTravelZonesAction,
} from "@/app/actions/workflowActions";
import { WorkflowCanvas } from "@/components/builder/WorkflowCanvas";
import { TransportationRouteControl } from "@/components/forms/TransportationRouteControl";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface ExtendedFormField {
  id: string;
  label: string;
  key: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "select"
    | "checkbox"
    | "file"
    | "user_picker"
    | "external_lookup"
    | "transportation_route"
    | "section_header"
    | "info_notice"
    | "glpi_category"
    | "glpi_urgency"
    | "glpi_asset"
    | "glpi_location";
  section: string;
  width: "full" | "half";
  required: boolean;
  readOnly: boolean;
  placeholder?: string;
  defaultValue?: string;
  optionsList?: string[];
  optionsSource?: string;
  // Advanced Settings
  autoFillVariable?: "none" | "user_name" | "user_email" | "user_dept" | "user_job" | "user_id" | "current_date" | "auto_ticket_no";
  minNumber?: number;
  maxNumber?: number;
  allowedFileTypes?: string;
}

function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Search and select...",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filtered = options.filter(opt =>
    (opt || "").toLowerCase().includes((search || "").toLowerCase())
  );

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 2 }}>
      <label style={{ fontSize: 10, fontWeight: 700, display: "block" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          className="form-control"
          style={{ fontSize: 11, padding: "4px 8px", width: "100%", paddingRight: "20px" }}
          placeholder={placeholder}
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setTimeout(() => {
              setIsOpen(false);
              // Fallback to value if they didn't pick from list
              if (search !== value && !options.includes(search)) {
                setSearch(value);
              }
            }, 250);
          }}
        />
        <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: 9, pointerEvents: "none", opacity: 0.6 }}>▼</span>
      </div>
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          zIndex: 99,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          maxHeight: 180,
          overflowY: "auto",
          marginTop: 2,
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 8, fontSize: 11, color: "var(--color-text-muted)" }}>
              No matches found
            </div>
          ) : (
            filtered.map((opt, idx) => (
              <div
                key={idx}
                style={{
                  padding: "6px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                  background: opt === value ? "rgba(79, 70, 229, 0.1)" : "transparent",
                  borderBottom: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
                onMouseDown={() => {
                  onChange(opt);
                  setSearch(opt);
                  setIsOpen(false);
                }}
              >
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MultiSearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Search and add...",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const tags = value
    ? value.split(",").map(t => t.trim()).filter(Boolean)
    : [];

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      const newTags = [...tags, tag];
      onChange(newTags.join(", "));
    }
    setSearch("");
    setIsOpen(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    onChange(newTags.join(", "));
  };

  const availableOptions = options.filter(opt => !tags.includes(opt));
  const filtered = availableOptions.filter(opt =>
    (opt || "").toLowerCase().includes((search || "").toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
      <label style={{ fontSize: 10, fontWeight: 700 }}>{label}</label>
      
      {/* Selected Tags Display */}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 2 }}>
          {tags.map((tag, idx) => (
            <span
              key={idx}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                fontWeight: 700,
                background: "rgba(79, 70, 229, 0.1)",
                color: "var(--color-primary, #4F46E5)",
                padding: "2px 6px",
                borderRadius: 4,
                border: "1px solid rgba(79, 70, 229, 0.2)",
              }}
            >
              {tag}
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-primary, #4F46E5)",
                  fontSize: 10,
                  cursor: "pointer",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  fontWeight: "bold",
                }}
                onClick={() => handleRemoveTag(tag)}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ position: "relative", display: "flex", gap: 4 }}>
        <input
          type="text"
          className="form-control"
          style={{ fontSize: 11, padding: "4px 8px", flex: 1 }}
          placeholder={placeholder}
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 250);
          }}
        />
        <button
          type="button"
          className="btn btn-sm btn-primary"
          style={{ fontSize: 11, padding: "4px 10px", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setIsOpen(!isOpen)}
        >
          ➕
        </button>
      </div>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          zIndex: 99,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          maxHeight: 150,
          overflowY: "auto",
          marginTop: 2,
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 8, fontSize: 11, color: "var(--color-text-muted)" }}>
              No matches found
            </div>
          ) : (
            filtered.map((opt, idx) => (
              <div
                key={idx}
                style={{
                  padding: "6px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                  borderBottom: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
                onMouseDown={() => handleAddTag(opt)}
              >
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function FormBuilderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { lang } = useLanguage();

  const [activeTab, setActiveTab] = useState<"fields" | "workflow" | "ticket_panel" | "preview">("fields");
  
  // Ticket Info Panel Perspective Config State
  const [panelConfig, setPanelConfig] = useState({
    customPanelTitle: lang === "ar" ? "تفاصيل ومعايير المعاملة" : "Ticket Information & Classification",
    showStatusClassification: true,
    showActorsAssignment: true,
    showSlaMetrics: true,
    showLocationBranch: true,
    showBusinessUnitBrand: true,
    showCostBudgetSummary: true,
    defaultPriority: "normal",
    defaultUrgency: "NORMAL",
    defaultImpact: "MEDIUM",
    defaultCategory: "General",
    defaultLocation: "Headquarters HQ",
    defaultUnit: "Brand Alpha - Retail",
    defaultAssignedGroup: "IT Support Group",
    defaultAssignedUser: "Khaled Samir (Manager)",
    defaultObservers: "Ahmed Mohamed, Sara Hassan",
    defaultSlaTto: "1 Hour",
    defaultSlaTtr: "24 Hours",
    defaultTotalCost: "1,250.00 EGP",
  });

  // Form Metadata
  const [formTitle, setFormTitle] = useState(lang === "ar" ? "استمارة خدمة جديدة" : "New Service Form");
  const [formCategory, setFormCategory] = useState("Expenses & Allowances");
  const [formDescription, setFormDescription] = useState(
    lang === "ar" 
      ? "قم بتعبئة البيانات المطلوبة لتقديم الطلب للمراجعة والاعتماد."
      : "Fill out the required information to submit the request for review and approval."
  );

  const [isEditingSidebarPanel, setIsEditingSidebarPanel] = useState(false);
  const [tempPanelTitle, setTempPanelTitle] = useState("");
  const [tempPriority, setTempPriority] = useState("normal");
  const [tempUrgency, setTempUrgency] = useState("NORMAL");
  const [tempImpact, setTempImpact] = useState("MEDIUM");
  const [tempCategory, setTempCategory] = useState("General");
  const [tempLocation, setTempLocation] = useState("");
  const [tempUnit, setTempUnit] = useState("");
  const [tempAssignedGroup, setTempAssignedGroup] = useState("");
  const [tempAssignedUser, setTempAssignedUser] = useState("");
  const [tempObservers, setTempObservers] = useState("");
  const [tempSlaTtoValue, setTempSlaTtoValue] = useState<number>(1);
  const [tempSlaTtoUnit, setTempSlaTtoUnit] = useState<string>("Hours");
  const [tempSlaTtrValue, setTempSlaTtrValue] = useState<number>(24);
  const [tempSlaTtrUnit, setTempSlaTtrUnit] = useState<string>("Hours");
  const [tempSlaTto, setTempSlaTto] = useState("");
  const [tempSlaTtr, setTempSlaTtr] = useState("");
  const [tempTotalCost, setTempTotalCost] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [travelZones, setTravelZones] = useState<any[]>([]);
  const [formIcon, setFormIcon] = useState("📋");
  const [formColor, setFormColor] = useState("#4F46E5");

  // Visibility & Targeting State
  const [visibilityScope, setVisibilityScope] = useState<"global" | "custom">("global");
  const [targetDeptIds, setTargetDeptIds] = useState<string[]>([]);
  const [targetGroupIds, setTargetGroupIds] = useState<string[]>([]);
  const [showVisibilitySection, setShowVisibilitySection] = useState(false);

  const [departments, setDepartments] = useState<any[]>([]);
  const [businessGroups, setBusinessGroups] = useState<any[]>([]);

  // Fields and Steps
  const [fields, setFields] = useState<ExtendedFormField[]>([]);
  const [editingField, setEditingField] = useState<ExtendedFormField | null>(null);
  const [fieldEditorTab, setFieldEditorTab] = useState<"basic" | "options" | "advanced">("basic");

  // Workflow Graph
  const [workflowNodes, setWorkflowNodes] = useState<any[]>([]);
  const [workflowEdges, setWorkflowEdges] = useState<any[]>([]);

  // Helper to parse an existing SLA string like "1 Hour" or "30 Minutes" into { value, unit }
  const parseSlaString = (sla: string): { value: number; unit: string } => {
    const trimmed = sla.trim();
    const match = trimmed.match(/^(\d+)\s*(.+)$/);
    if (match) {
      let unit = match[2].trim();
      // Normalize unit format
      if (unit === "Minute" || unit === "Minutes") unit = "Minutes";
      else if (unit === "Hour" || unit === "Hours") unit = "Hours";
      else if (unit === "Day" || unit === "Days") unit = "Days";
      else if (unit === "Month" || unit === "Months") unit = "Months";
      return { value: parseInt(match[1], 10), unit };
    }
    return { value: 1, unit: "Hours" };
  };

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const TOOLBOX_ITEMS = [
    { type: "text", label: lang === "ar" ? "نص قصير (Short Text)" : "Short Text", icon: "Aa", category: "Basic", color: "#4F46E5" },
    { type: "textarea", label: lang === "ar" ? "نص طويل / تفاصيل (Long Text)" : "Long Text / Notes", icon: "📝", category: "Basic", color: "#4F46E5" },
    { type: "number", label: lang === "ar" ? "رقم / مبلغ (Number)" : "Number / Amount", icon: "#", category: "Basic", color: "#4F46E5" },
    { type: "date", label: lang === "ar" ? "تاريخ (Date Picker)" : "Date Picker", icon: "📅", category: "Basic", color: "#4F46E5" },
    { type: "select", label: lang === "ar" ? "قائمة خيارات (Dropdown)" : "Dropdown List", icon: "📋", category: "Basic", color: "#4F46E5" },
    { type: "checkbox", label: lang === "ar" ? "مربع إقرار / اختيار (Checkbox)" : "Checkbox / Toggle", icon: "☑️", category: "Basic", color: "#4F46E5" },
    { type: "file", label: lang === "ar" ? "إرفاق ملف / مستند (File Upload)" : "File Upload", icon: "📎", category: "Basic", color: "#4F46E5" },
    { type: "transportation_route", label: lang === "ar" ? "📍 خط سير ومصاريف انتقال (Route)" : "📍 Travel Route & Allowance", icon: "🚗", category: "Travel", color: "#EC4899" },
    { type: "glpi_category", label: lang === "ar" ? "📌 تصنيف ونوع المعاملة (Category)" : "📌 Ticket Category", icon: "🏷️", category: "Standard Metrics", color: "#8B5CF6" },
    { type: "glpi_urgency", label: lang === "ar" ? "⚡ مصفوفة الأهمية والتأثير (Urgency)" : "⚡ Urgency & Impact Matrix", icon: "⚡", category: "Standard Metrics", color: "#8B5CF6" },
    { type: "glpi_location", label: lang === "ar" ? "📍 موقع / فرع الخدمة (Service Location)" : "📍 Branch / Site Location", icon: "📍", category: "Standard Metrics", color: "#8B5CF6" },
    { type: "section_header", label: lang === "ar" ? "عنوان قسم فرعي (Section Header)" : "Section Header", icon: "📌", category: "Layout", color: "#F59E0B" },
    { type: "info_notice", label: lang === "ar" ? "مربع تنبيه وإرشادات (Notice Box)" : "Info Notice Box", icon: "💡", category: "Layout", color: "#F59E0B" },
    { type: "user_picker", label: lang === "ar" ? "اختيار موظف / مدير (User Picker)" : "User / Manager Picker", icon: "👤", category: "Advanced", color: "#10B981" },
  ];

  // Load Departments and Groups
  useEffect(() => {
    fetchOrgHierarchyAction().then(res => setDepartments(res || []));
    fetchBusinessGroupsAction().then(res => setBusinessGroups(res || []));
    fetchSystemUsersAction().then(res => setUsers(res || []));
    fetchTravelZonesAction().then(res => setTravelZones(res || []));
  }, []);

  // Load Existing Form if Editing
  useEffect(() => {
    if (editId) {
      fetchCatalogWorkflowsAction().then(list => {
        const found = list.find((w: any) => w.id === editId || w.slug === editId);
        if (found) {
          setFormTitle(found.name || "");
          setFormCategory(found.category || "General");
          setFormDescription(found.description || "");
          setFormIcon(found.icon || "📋");
          setFormColor(found.color || "#4F46E5");

          if (found.visibility_rules) {
            const isGlob = found.visibility_rules.is_global !== false;
            setVisibilityScope(isGlob ? "global" : "custom");
            setTargetDeptIds(found.visibility_rules.department_ids || []);
            setTargetGroupIds(found.visibility_rules.group_ids || []);
            if (!isGlob) setShowVisibilitySection(true);

            if (found.visibility_rules.ticket_info_panel_config) {
              setPanelConfig(prev => ({
                ...prev,
                ...found.visibility_rules.ticket_info_panel_config,
              }));
            }
          }

          const loadedFields = found.fields || (found as any).fields_json;
          if (Array.isArray(loadedFields)) {
            setFields(loadedFields as any);
          }
          const loadedGraph = found.react_flow_graph_json || (found as any).react_flow_graph;
          if (loadedGraph) {
            setWorkflowNodes(loadedGraph.nodes || []);
            setWorkflowEdges(loadedGraph.edges || []);
          }
        }
      });
    }
  }, [editId]);

  // Toggle Department Choice
  const toggleDept = (deptId: string) => {
    setTargetDeptIds(prev =>
      prev.includes(deptId) ? prev.filter(d => d !== deptId) : [...prev, deptId]
    );
  };

  // Toggle Group Choice
  const toggleGroup = (groupId: string) => {
    setTargetGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]
    );
  };

  // Add Field
  const addField = (item: typeof TOOLBOX_ITEMS[0]) => {
    let presetOptions: string[] = [];
    if (item.type === "select") {
      presetOptions = [lang === "ar" ? "خيار 1" : "Option 1", lang === "ar" ? "خيار 2" : "Option 2"];
    } else if (item.type === "glpi_category") {
      presetOptions = ["Incident / عطل طارئ", "Service Request / طلب خدمة عامة", "Change / طلب تغيير وصيانة", "Problem / مشكلة بنيوية"];
    } else if (item.type === "glpi_urgency") {
      presetOptions = ["High Priority / أولوية قصوى", "Medium Priority / أولوية متوسطة", "Low Priority / أولوية منخفضة"];
    } else if (item.type === "glpi_location") {
      presetOptions = ["Headquarters / المقر الرئيسي HQ", "Alexandria Branch / فرع الإسكندرية", "Cairo Office / فرع القاهرة"];
    }

    const newField: ExtendedFormField = {
      id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: item.label.split("(")[0].trim(),
      key: item.type.startsWith("glpi_") ? item.type : `field_${Date.now()}`,
      type: item.type as any,
      section: item.type.startsWith("glpi_") ? (lang === "ar" ? "معايير المعاملة (Standard Panel)" : "Ticket Info Panel (Standard Metrics)") : (lang === "ar" ? "البيانات الأساسية" : "General Information"),
      width: item.type === "textarea" || item.type === "transportation_route" || item.type === "section_header" || item.type === "info_notice" ? "full" : "half",
      required: true,
      readOnly: false,
      placeholder: item.type === "select" || item.type.startsWith("glpi_") ? (lang === "ar" ? "اختر من القائمة..." : "Select option...") : (lang === "ar" ? "أدخل البيانات هنا..." : "Enter details..."),
      optionsList: presetOptions,
    };

    setFields(prev => [...prev, newField]);
    setEditingField(newField);
  };

  // Move Field Up/Down
  const moveField = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === fields.length - 1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...fields];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setFields(updated);
  };

  // Delete Field
  const deleteField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
    if (editingField?.id === id) setEditingField(null);
  };

  // Update Field in State
  const updateEditingField = (patch: Partial<ExtendedFormField>) => {
    if (!editingField) return;
    const updated = { ...editingField, ...patch };
    setEditingField(updated);
    setFields(prev => prev.map(f => f.id === updated.id ? updated : f));
  };

  // Persist form to MySQL database (shared by full save and the panel "Save" button)
  const persistForm = async (panelCfg?: typeof panelConfig) => {
    const slug = editId || `form-${formTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
    await createWorkflowFormAction({
      id: editId || undefined,
      name: formTitle,
      slug,
      category: formCategory,
      description: formDescription,
      icon: formIcon,
      color: formColor,
      fields,
      visibility_rules: {
        is_global: visibilityScope === "global",
        department_ids: visibilityScope === "global" ? [] : targetDeptIds,
        group_ids: visibilityScope === "global" ? [] : targetGroupIds,
        user_ids: [],
        ticket_info_panel_config: panelCfg || panelConfig,
      },
      react_flow_graph: {
        nodes: workflowNodes,
        edges: workflowEdges,
      },
    });
  };

  // Save Complete Form & Workflow
  const handleSaveForm = async () => {
    if (!formTitle.trim()) {
      alert(lang === "ar" ? "يرجى كتابة اسم الاستمارة أولاً." : "Please enter the form title.");
      return;
    }
    setSaving(true);
    setSaveSuccess(false);

    try {
      await persistForm();

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        router.push("/workflows");
      }, 1500);
    } catch (err: any) {
      alert(lang === "ar" ? "حدث خطأ أثناء حفظ الاستمارة: " + (err?.message || err) : "Error saving form: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", background: "var(--color-bg)", direction: lang === "ar" ? "rtl" : "ltr", textAlign: lang === "ar" ? "right" : "left" }}>
      
      {/* ── TOP HEADER TOOLBAR ── */}
      <div style={{ padding: "12px 24px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/workflows">
            <button className="btn btn-outline btn-sm">
              {lang === "ar" ? "← العودة للكتالوج" : "← Back to Catalog"}
            </button>
          </Link>
          <div style={{ fontSize: 24 }}>{formIcon}</div>
          <div>
            <input
              style={{ fontSize: 16, fontWeight: 900, border: "none", background: "transparent", outline: "none", color: "var(--color-text-primary)" }}
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder={lang === "ar" ? "اسم الاستمارة..." : "Form Title..."}
            />
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              {lang === "ar" ? "مصمم الاستمارة الذكي (No-Code Form & Workflow Builder)" : "No-Code Form & Workflow Builder"}
            </div>
          </div>
        </div>

        {/* TABS & SAVE ACTION */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", background: "var(--color-bg)", padding: 4, borderRadius: 8, border: "1px solid var(--color-border)" }}>
            <button
              className={`btn btn-sm ${activeTab === "fields" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("fields")}
            >
              🎨 {lang === "ar" ? `تصميم الحقول (${fields.length})` : `Form Fields (${fields.length})`}
            </button>
            <button
              className={`btn btn-sm ${activeTab === "workflow" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("workflow")}
            >
              ⚡ {lang === "ar" ? "مسار الاعتماد والشروط" : "Approval Workflow"}
            </button>
            <button
              className={`btn btn-sm ${activeTab === "ticket_panel" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("ticket_panel")}
            >
              📊 {lang === "ar" ? "تخصيص لوحة المعاملة" : "Ticket Info Panel"}
            </button>
            <button
              className={`btn btn-sm ${activeTab === "preview" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("preview")}
            >
              👁️ {lang === "ar" ? "معاينة مباشرة" : "Live Preview"}
            </button>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSaveForm}
            disabled={saving}
          >
            {saving 
              ? (lang === "ar" ? "⏳ جاري الحفظ..." : "⏳ Saving...") 
              : saveSuccess 
                ? (lang === "ar" ? "✅ تم الحفظ!" : "✅ Saved!") 
                : (lang === "ar" ? "💾 حفظ ونشر الاستمارة" : "💾 Save & Publish")}
          </button>
        </div>
      </div>

      {/* ── TAB 1: FORM FIELDS DESIGNER ── */}
      {activeTab === "fields" && (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: lang === "ar" ? "260px 1fr 340px" : "340px 1fr 260px", overflow: "hidden" }}>
          
          {/* TOOLBOX PALETTE */}
          <div style={{ background: "var(--color-surface)", borderRight: lang === "ar" ? "none" : "1px solid var(--color-border)", borderLeft: lang === "ar" ? "1px solid var(--color-border)" : "none", padding: 16, overflowY: "auto" }}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12, color: "var(--color-text-primary)" }}>
              {lang === "ar" ? "➕ اضغط لإضافة حقل للاستمارة:" : "➕ Click to Add Field:"}
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TOOLBOX_ITEMS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => addField(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: lang === "ar" ? "right" : "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = item.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <div style={{ flex: 1, fontWeight: 700, fontSize: 12 }}>{item.label}</div>
                  <span style={{ fontSize: 14, color: "var(--color-text-muted)" }}>＋</span>
                </button>
              ))}
            </div>
          </div>

          {/* MIDDLE LIVE CANVAS */}
          <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            
            {/* Form General Settings & Target Audience */}
            <div className="card" style={{ padding: 16, border: "1px solid var(--color-border)", borderRadius: 10, background: "var(--color-surface)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>
                    {lang === "ar" ? "تصنيف الاستمارة (Category)" : "Category"}
                  </label>
                  <select
                    className="form-control"
                    style={{ fontSize: 12 }}
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                  >
                    <option value="Expenses & Allowances">{lang === "ar" ? "المصروفات والبدلات" : "Expenses & Allowances"}</option>
                    <option value="Attendance & Leave">{lang === "ar" ? "الإجازات والحضور" : "Attendance & Leave"}</option>
                    <option value="IT & Tech Support">{lang === "ar" ? "الدعم الفني والـ IT" : "IT & Tech Support"}</option>
                    <option value="Procurement & Services">{lang === "ar" ? "المشتريات والخدمات" : "Procurement & Services"}</option>
                    <option value="Human Resources">{lang === "ar" ? "خدمات الموارد البشرية" : "Human Resources"}</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>
                    {lang === "ar" ? "وصف استمارة الخدمة" : "Form Description"}
                  </label>
                  <input
                    className="form-control"
                    style={{ fontSize: 12 }}
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Collapsible Visibility & Targeting Section */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--color-border)" }}>
                <button
                  type="button"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, color: "var(--color-primary)", display: "flex", alignItems: "center", gap: 6, padding: 0 }}
                  onClick={() => setShowVisibilitySection(!showVisibilitySection)}
                >
                  🔒 {lang === "ar" ? "إعدادات الجمهور المستهدف والظهور (تحديد من تظهر له الاستمارة)" : "Target Audience & Visibility Settings"}
                  <span>{showVisibilitySection ? "▲" : "▼"}</span>
                </button>

                {showVisibilitySection && (
                  <div style={{ marginTop: 12, background: "var(--color-bg)", padding: 14, borderRadius: 8, border: "1px solid var(--color-border)" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                      {lang === "ar" ? "من يمكنه رؤية وتعبئة هذه الاستمارة؟" : "Who can see and submit this request form?"}
                    </div>

                    <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12 }}>
                        <input
                          type="radio"
                          name="visScope"
                          checked={visibilityScope === "global"}
                          onChange={() => setVisibilityScope("global")}
                        />
                        🌐 {lang === "ar" ? "جميع الموظفين بالشركة (عام للجميع)" : "All Employees (Global)"}
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12 }}>
                        <input
                          type="radio"
                          name="visScope"
                          checked={visibilityScope === "custom"}
                          onChange={() => setVisibilityScope("custom")}
                        />
                        🔒 {lang === "ar" ? "تحديد قطاعات / أقسام أو مجموعات عمل معينة" : "Specific Departments or Groups"}
                      </label>
                    </div>

                    {visibilityScope === "custom" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
                        {/* Departments Checklist */}
                        <div>
                          <label style={{ fontWeight: 800, fontSize: 11, display: "block", marginBottom: 6 }}>
                            🏢 {lang === "ar" ? "القطاعات والأقسام المسموح لها:" : "Target Departments:"}
                          </label>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto", background: "var(--color-surface)", padding: 8, borderRadius: 6, border: "1px solid var(--color-border)" }}>
                            {departments.map(d => (
                              <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11 }}>
                                <input
                                  type="checkbox"
                                  checked={targetDeptIds.includes(d.id)}
                                  onChange={() => toggleDept(d.id)}
                                />
                                {d.name} ({d.code})
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Business Groups Checklist */}
                        <div>
                          <label style={{ fontWeight: 800, fontSize: 11, display: "block", marginBottom: 6 }}>
                            👥 {lang === "ar" ? "مجموعات العمل المسموح لها:" : "Target Business Groups:"}
                          </label>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto", background: "var(--color-surface)", padding: 8, borderRadius: 6, border: "1px solid var(--color-border)" }}>
                            {businessGroups.map(g => (
                              <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11 }}>
                                <input
                                  type="checkbox"
                                  checked={targetGroupIds.includes(g.id)}
                                  onChange={() => toggleGroup(g.id)}
                                />
                                {g.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Fields List */}
            {fields.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", border: "2px dashed var(--color-border)", borderRadius: 12, background: "var(--color-surface)" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🎨</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>
                  {lang === "ar" ? "الاستمارة فارغة حتى الآن" : "The Form is Empty"}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                  {lang === "ar" 
                    ? "اضغط على أي حقل من القائمة لإضافته هنا وبناء الاستمارة بسهولة." 
                    : "Click any field from the palette to add it and build your form."}
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {fields.map((field, idx) => {
                  const isSelected = editingField?.id === field.id;
                  const isFull = field.width === "full" || field.type === "transportation_route" || field.type === "section_header" || field.type === "info_notice";

                  return (
                    <div
                      key={field.id}
                      onClick={() => setEditingField(field)}
                      style={{
                        gridColumn: isFull ? "span 2" : "span 1",
                        background: isSelected ? "var(--color-primary-light)" : "var(--color-surface)",
                        border: isSelected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                        borderRadius: 10,
                        padding: 14,
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {/* Action buttons */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-primary)" }}>
                          #{idx + 1} {field.label} {field.required && <span style={{ color: "red" }}>*</span>}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={(e) => { e.stopPropagation(); moveField(idx, "up"); }}
                            disabled={idx === 0}
                          >▲</button>
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={(e) => { e.stopPropagation(); moveField(idx, "down"); }}
                            disabled={idx === fields.length - 1}
                          >▼</button>
                          <button
                            className="btn btn-outline btn-xs"
                            style={{ color: "var(--color-danger)" }}
                            onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                          >🗑</button>
                        </div>
                      </div>

                      {/* Live Field Preview */}
                      {field.type === "section_header" && (
                        <div style={{ fontWeight: 900, fontSize: 14, borderBottom: "2px solid var(--color-primary)", paddingBottom: 4 }}>
                          📌 {field.label}
                        </div>
                      )}

                      {field.type === "info_notice" && (
                        <div style={{ background: "#FEF3C7", color: "#B45309", padding: 10, borderRadius: 6, fontSize: 11 }}>
                          💡 {field.placeholder || field.label}
                        </div>
                      )}

                      {field.type === "text" && (
                        <input className="form-control" style={{ fontSize: 11 }} placeholder={field.placeholder} disabled />
                      )}

                      {field.type === "textarea" && (
                        <textarea className="form-control" rows={2} style={{ fontSize: 11 }} placeholder={field.placeholder} disabled />
                      )}

                      {field.type === "number" && (
                        <input type="number" className="form-control" style={{ fontSize: 11 }} placeholder={field.placeholder} disabled />
                      )}

                      {field.type === "date" && (
                        <input type="date" className="form-control" style={{ fontSize: 11 }} disabled />
                      )}

                      {field.type === "select" && (
                        <select className="form-control" style={{ fontSize: 11 }} disabled>
                          <option>{field.placeholder || (lang === "ar" ? "اختر من القائمة..." : "Select...")}</option>
                          {field.optionsList?.map((opt, oi) => <option key={oi}>{opt}</option>)}
                        </select>
                      )}

                      {field.type === "checkbox" && (
                        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, cursor: "pointer" }}>
                          <input type="checkbox" disabled /> {field.label}
                        </label>
                      )}

                      {field.type === "file" && (
                        <div style={{ border: "1px dashed var(--color-border)", padding: 10, textAlign: "center", fontSize: 11, color: "var(--color-text-muted)", borderRadius: 6 }}>
                          📎 {lang === "ar" ? "اضغط أو اسحب الملفات للإرفاق هنا" : "Click or drag files to upload"}
                        </div>
                      )}

                      {field.type === "transportation_route" && (
                        <div style={{ pointerEvents: "none" }}>
                          <TransportationRouteControl value={[]} onChange={() => {}} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* EDITING PANEL */}
          <div style={{ background: "var(--color-surface)", borderRight: lang === "ar" ? "1px solid var(--color-border)" : "none", borderLeft: lang === "ar" ? "none" : "1px solid var(--color-border)", padding: 16, overflowY: "auto" }}>
            {editingField ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>
                    ⚙️ {lang === "ar" ? `إعدادات الحقل: ${editingField.label}` : `Field Settings: ${editingField.label}`}
                  </div>
                  <button className="btn btn-outline btn-xs" onClick={() => setEditingField(null)}>✕</button>
                </div>

                {/* Sub-tabs */}
                <div style={{ display: "flex", gap: 4, background: "var(--color-bg)", padding: 3, borderRadius: 6 }}>
                  <button
                    className={`btn btn-xs ${fieldEditorTab === "basic" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFieldEditorTab("basic")}
                    style={{ flex: 1 }}
                  >
                    {lang === "ar" ? "الأساسية" : "Basic"}
                  </button>
                  {editingField.type === "select" && (
                    <button
                      className={`btn btn-xs ${fieldEditorTab === "options" ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setFieldEditorTab("options")}
                      style={{ flex: 1 }}
                    >
                      {lang === "ar" ? "الخيارات" : "Options"}
                    </button>
                  )}
                  <button
                    className={`btn btn-xs ${fieldEditorTab === "advanced" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFieldEditorTab("advanced")}
                    style={{ flex: 1 }}
                  >
                    {lang === "ar" ? "متقدم ⚙" : "Advanced ⚙"}
                  </button>
                </div>

                {/* TAB 1: BASIC SETTINGS */}
                {fieldEditorTab === "basic" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>
                        {lang === "ar" ? "عنوان الحقل (Label) *" : "Field Label *"}
                      </label>
                      <input
                        className="form-control"
                        style={{ fontSize: 12 }}
                        value={editingField.label}
                        onChange={e => updateEditingField({ label: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>
                        {lang === "ar" ? "التسمية التوضيحية (Placeholder)" : "Placeholder Text"}
                      </label>
                      <input
                        className="form-control"
                        style={{ fontSize: 12 }}
                        value={editingField.placeholder || ""}
                        onChange={e => updateEditingField({ placeholder: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>
                        {lang === "ar" ? "عرض الحقل في الشاشة" : "Field Layout Width"}
                      </label>
                      <select
                        className="form-control"
                        style={{ fontSize: 12 }}
                        value={editingField.width}
                        onChange={e => updateEditingField({ width: e.target.value as any })}
                      >
                        <option value="half">{lang === "ar" ? "نصف صف (2 حقل بالسطر)" : "Half Width (2 per row)"}</option>
                        <option value="full">{lang === "ar" ? "سطر كامل (Full Row)" : "Full Width (1 per row)"}</option>
                      </select>
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, marginTop: 6 }}>
                      <input
                        type="checkbox"
                        checked={editingField.required}
                        onChange={e => updateEditingField({ required: e.target.checked })}
                      />
                      {lang === "ar" ? "حقل إجباري (Required Field)" : "Required Field"}
                    </label>
                  </div>
                )}

                {/* TAB 2: DROPDOWN OPTIONS */}
                {fieldEditorTab === "options" && editingField.type === "select" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700 }}>
                      {lang === "ar" ? "اكتب الخيارات (كل خيار بسطر منفصل):" : "Enter Options (one option per line):"}
                    </label>
                    <textarea
                      className="form-control"
                      rows={6}
                      style={{ fontSize: 12, direction: lang === "ar" ? "rtl" : "ltr" }}
                      value={(editingField.optionsList || []).join("\n")}
                      onChange={e => updateEditingField({ optionsList: e.target.value.split("\n").filter(Boolean) })}
                    />
                  </div>
                )}

                {/* TAB 3: ADVANCED SETTINGS */}
                {fieldEditorTab === "advanced" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>
                        {lang === "ar" ? "التعبئة التلقائية (Auto-Fill Variable)" : "Auto-Fill Variable"}
                      </label>
                      <select
                        className="form-control"
                        style={{ fontSize: 12 }}
                        value={editingField.autoFillVariable || "none"}
                        onChange={e => updateEditingField({ autoFillVariable: e.target.value as any })}
                      >
                        <option value="none">{lang === "ar" ? "بدون تعبئة تلقائية" : "None"}</option>
                        <option value="user_name">{lang === "ar" ? "اسم الموظف المقدم للطلب" : "Requester Full Name"}</option>
                        <option value="user_email">{lang === "ar" ? "البريد الإلكتروني للموظف" : "Requester Email"}</option>
                        <option value="user_dept">{lang === "ar" ? "اسم الإدارة / القطاع" : "Department Name"}</option>
                        <option value="user_job">{lang === "ar" ? "المسمى الوظيفي للموظف" : "Job Title"}</option>
                        <option value="current_date">{lang === "ar" ? "تاريخ اليوم الحقيقي" : "Current Date"}</option>
                      </select>
                    </div>

                    {editingField.type === "number" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700 }}>{lang === "ar" ? "أدنى قيمة (Min)" : "Min Value"}</label>
                          <input
                            type="number"
                            className="form-control"
                            style={{ fontSize: 11 }}
                            value={editingField.minNumber || ""}
                            onChange={e => updateEditingField({ minNumber: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700 }}>{lang === "ar" ? "أقصى قيمة (Max)" : "Max Value"}</label>
                          <input
                            type="number"
                            className="form-control"
                            style={{ fontSize: 11 }}
                            value={editingField.maxNumber || ""}
                            onChange={e => updateEditingField({ maxNumber: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div style={{ padding: 30, textAlign: "center", color: "var(--color-text-muted)" }}>
                {lang === "ar" ? "اضغط على أي حقل في الشاشة الوسطى لتعديل خصائصه هنا." : "Click any field in canvas to edit properties."}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── TAB 2: APPROVAL WORKFLOW STEP BUILDER ── */}
      {/* ── TAB 3: FULL INTERACTIVE TICKET PAGE PREVIEW & PANEL DESIGNER ── */}
      {activeTab === "ticket_panel" && (
        <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Top Control Bar & Quick Toggle Toolbar */}
          <div className="card" style={{ padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>🖥️</span>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
                    {lang === "ar" ? "معاينة وتخصيص منظور صفحة المعاملة الكاملة (Full Ticket Page Designer)" : "Full Ticket View Designer & Perspective Config"}
                  </h3>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                    {lang === "ar" ? "معاينة حية وتفاعلية تظهر شكل المعاملة وأزرار الاعتماد والحقول واللوحة الجانبية كما يراها الموظفون والمديرون" : "Live interactive mockup showing the exact ticket view, decision action buttons, form fields, and sidebar panel."}
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontWeight: 800, fontSize: 12, whiteSpace: "nowrap" }}>
                  📌 {lang === "ar" ? "عنوان اللوحة الجانبية:" : "Panel Title:"}
                </label>
                <input
                  className="form-control"
                  style={{ width: 260, fontSize: 12, padding: "6px 12px" }}
                  value={panelConfig.customPanelTitle}
                  onChange={e => setPanelConfig(prev => ({ ...prev, customPanelTitle: e.target.value }))}
                  placeholder="Enter panel title..."
                />
              </div>
            </div>
          </div>

          {/* ── FULL TICKET MOCKUP PREVIEW FRAME ── */}
          <div style={{ background: "var(--color-bg)", padding: 20, borderRadius: 12, border: "2px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 16 }}>
            
            {/* 1. MOCKUP TOP TICKET HEADER BAR */}
            <div className="card" style={{ padding: "16px 20px", background: "var(--color-surface)", borderBottom: "3px solid var(--color-primary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: "var(--color-primary)" }}>REQ-2026-88392</span>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{formTitle}</h2>
                  <span className="badge pending">PENDING APPROVAL</span>
                  <span className="badge urgent">HIGH PRIORITY</span>
                </div>

                <div style={{ textAlign: "right", padding: "6px 12px", background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>SLA Target Countdown</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#10B981" }}>⏱️ 23h : 45m : 12s Remaining</div>
                </div>
              </div>
            </div>

            {/* 2. MAIN 2-COLUMN TICKET LAYOUT */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
              
              {/* LEFT MAIN TICKET BODY */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                
                {/* 📝 Card 1: Ticket Form Details (Rendered from Tab 1 Fields) */}
                <div className="card">
                  <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="card-title">📝 Ticket Form Details</div>
                    <span className="tag">{fields.length} Form Fields</span>
                  </div>
                  <div className="card-body">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      {fields.length > 0 ? fields.map(field => {
                        const isFull = field.width === "full" || field.type === "transportation_route" || field.type === "textarea" || field.type === "section_header" || field.type === "info_notice";
                        return (
                          <div key={field.id} style={{ gridColumn: isFull ? "1 / -1" : "auto" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 4 }}>
                              {field.label}
                            </div>
                            {field.type === "section_header" ? (
                              <div style={{ fontWeight: 900, fontSize: 14, color: "var(--color-primary)", borderBottom: "2px solid var(--color-primary)", paddingBottom: 4 }}>
                                📌 {field.label}
                              </div>
                            ) : field.type === "info_notice" ? (
                              <div style={{ background: "#FEF3C7", color: "#B45309", padding: 10, borderRadius: 6, fontSize: 11 }}>
                                💡 {field.placeholder || field.label}
                              </div>
                            ) : field.type === "transportation_route" ? (
                              <div style={{ padding: 16, background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-primary)", fontSize: 12 }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-primary)", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                                    🚗 تفاصيل السفر والانتقال المجمعة (Travel Route & Financial Package Breakdown)
                                  </div>

                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                                    <div>📍 <strong>خط السير:</strong> من <strong>[التجمع الخامس]</strong> إلى <strong>[الاسكندرية]</strong></div>
                                    <div>📅 <strong>الفترة:</strong> 2026-08-01 <span>إلى 2026-08-02</span> (مبيت 🌙)</div>
                                    <div>👥 <strong>اجتماع عمل:</strong> نعم (يوجد اجتماع)</div>
                                    <div>🎟️ <strong>تذكرة سفر:</strong> تم الإرفاق 📎 (تذكرة قطار/طيران)</div>
                                  </div>

                                  {/* Itemized Financial Breakdown Table */}
                                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 4 }}>
                                    <thead>
                                      <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                                        <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>البند (Expense Item)</th>
                                        <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700 }}>التكلفة (Amount)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                                        <td style={{ padding: "8px 10px", textAlign: "right" }}>🚗 بدل الانتقال (ترافرس - لائحة السفر)</td>
                                        <td style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700 }}>250.00 ج.م</td>
                                      </tr>
                                      <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                                        <td style={{ padding: "8px 10px", textAlign: "right" }}>🍔 بدل الوجبات والإقامة (Meals & Overnight Allowance)</td>
                                        <td style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700 }}>150.00 ج.م</td>
                                      </tr>
                                      <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                                        <td style={{ padding: "8px 10px", textAlign: "right" }}>🅿️ رسوم باركينج ومراسلات (Parking & Misc Costs)</td>
                                        <td style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700 }}>50.00 ج.م</td>
                                      </tr>
                                      <tr style={{ background: "#ECFDF5", borderTop: "2px solid #10B981" }}>
                                        <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 900, color: "#065F46" }}>💰 الإجمالي المستحق (Grand Total):</td>
                                        <td style={{ padding: "10px 10px", textAlign: "left", fontWeight: 950, color: "#047857", fontSize: 14 }}>450.00 ج.م</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, fontWeight: 700, padding: "8px 12px", background: "var(--color-bg)", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                                {field.placeholder || "Sample Form Field Value"}
                              </div>
                            )}
                          </div>
                        );
                      }) : (
                        <div style={{ gridColumn: "1 / -1", padding: 16, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>
                          {lang === "ar" ? "لم تقم بإضافة حقول بعد في تبويب تصميم الحقول." : "No form fields added yet. Go to Form Fields tab to add fields."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ⚡ Card 2: Decision Action Buttons (Entered Actions) */}
                <div className="card" style={{ padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: "var(--color-text-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>⚡ Available Decision Actions for Reviewer: <strong style={{ color: "var(--color-primary)" }}>Khaled Samir (IT Director)</strong></span>
                    <span className="tag primary">Approval Step #1</span>
                  </div>
                  
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn btn-primary" style={{ background: "#10B981", borderColor: "#10B981", padding: "8px 16px", fontWeight: 800 }}>
                      ✓ Approve Ticket (اعتماد الطلب)
                    </button>
                    <button className="btn" style={{ background: "#EF4444", color: "#fff", padding: "8px 16px", fontWeight: 800 }}>
                      ✕ Reject Ticket (رفض الطلب)
                    </button>
                    <button className="btn" style={{ background: "#F59E0B", color: "#fff", padding: "8px 16px", fontWeight: 800 }}>
                      💬 Request Information (طلب استفسار RFI)
                    </button>
                    <button className="btn btn-outline" style={{ padding: "8px 16px", fontWeight: 700 }}>
                      ⚙️ Reassign / Delegate (تحويل للمراجعة)
                    </button>
                  </div>
                </div>

                {/* 💬 Card 3: Activity Timeline & Audit Log */}
                <div className="card">
                  <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="card-title">💬 Activity Timeline & Audit Log Ledger</div>
                    <span className="tag">Audit Trail</span>
                  </div>
                  <div className="card-body">
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ padding: 10, borderRadius: 6, background: "var(--color-bg)", border: "1px solid var(--color-border)", fontSize: 12 }}>
                        <strong>Ahmed Mohamed (IT Staff)</strong> submitted request and routed automatically to Department Manager.
                      </div>
                      <div style={{ padding: 10, borderRadius: 6, background: "#FFFBEB", border: "1px solid #FCD34D", fontSize: 12 }}>
                        🔒 <strong>Internal Note:</strong> Budget approved under Q3 Travel Expense allocation.
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT SIDEBAR TICKET INFO PANEL (Customizable Live Panel) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="card" style={{ border: "2px solid var(--color-primary)" }}>
                  <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="card-title" style={{ fontSize: 13 }}>📊 {panelConfig.customPanelTitle}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${isEditingSidebarPanel ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => {
                          if (!isEditingSidebarPanel) {
                            setTempPanelTitle(panelConfig.customPanelTitle);
                            setTempPriority(panelConfig.defaultPriority || "normal");
                            setTempUrgency(panelConfig.defaultUrgency || "NORMAL");
                            setTempImpact(panelConfig.defaultImpact || "MEDIUM");
                            setTempCategory(panelConfig.defaultCategory || "General");
                            setTempLocation(panelConfig.defaultLocation || "Headquarters HQ");
                            setTempUnit(panelConfig.defaultUnit || "Brand Alpha - Retail");
                            setTempAssignedGroup(panelConfig.defaultAssignedGroup || "IT Support Group");
                            setTempAssignedUser(panelConfig.defaultAssignedUser || "Khaled Samir (Manager)");
                            setTempObservers(panelConfig.defaultObservers ?? "Ahmed Mohamed, Sara Hassan");
                            const parsedTto = parseSlaString(panelConfig.defaultSlaTto || "1 Hour");
                            setTempSlaTtoValue(parsedTto.value);
                            setTempSlaTtoUnit(parsedTto.unit);
                            setTempSlaTto(panelConfig.defaultSlaTto || "1 Hour");
                            const parsedTtr = parseSlaString(panelConfig.defaultSlaTtr || "24 Hours");
                            setTempSlaTtrValue(parsedTtr.value);
                            setTempSlaTtrUnit(parsedTtr.unit);
                            setTempSlaTtr(panelConfig.defaultSlaTtr || "24 Hours");
                            setTempTotalCost(panelConfig.defaultTotalCost || "1,250.00 EGP");
                          }
                          setIsEditingSidebarPanel(!isEditingSidebarPanel);
                        }}
                        style={{ fontSize: 11, padding: "2px 8px" }}
                      >
                        {isEditingSidebarPanel ? "✕ Close" : "✏️ Edit Panel Defaults"}
                      </button>
                    </div>
                  </div>

                  <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    
                    {isEditingSidebarPanel ? (
                      <div style={{ background: 'var(--color-bg)', padding: 10, borderRadius: 8, border: '1px solid var(--color-primary)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: 6 }}>
                          ✏️ Edit Default Workflow Details
                        </div>

                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 2 }}>Panel Title:</label>
                          <input className="form-control" style={{ fontSize: 11, padding: '4px' }} value={tempPanelTitle} onChange={e => setTempPanelTitle(e.target.value)} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 2 }}>Priority:</label>
                            <select className="form-control" style={{ fontSize: 11, padding: '2px' }} value={tempPriority} onChange={e => setTempPriority(e.target.value)}>
                              <option value="low">LOW</option>
                              <option value="normal">NORMAL</option>
                              <option value="high">HIGH</option>
                              <option value="urgent">URGENT</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 2 }}>Urgency:</label>
                            <select className="form-control" style={{ fontSize: 11, padding: '2px' }} value={tempUrgency} onChange={e => setTempUrgency(e.target.value)}>
                              <option value="LOW">LOW</option>
                              <option value="NORMAL">NORMAL</option>
                              <option value="HIGH">HIGH</option>
                              <option value="CRITICAL">CRITICAL</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 2 }}>Impact:</label>
                            <select className="form-control" style={{ fontSize: 11, padding: '2px' }} value={tempImpact} onChange={e => setTempImpact(e.target.value)}>
                              <option value="LOW">LOW</option>
                              <option value="MEDIUM">MEDIUM</option>
                              <option value="HIGH">HIGH</option>
                              <option value="CRITICAL">CRITICAL</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 2 }}>Category:</label>
                            <input className="form-control" style={{ fontSize: 11, padding: '4px' }} value={tempCategory} onChange={e => setTempCategory(e.target.value)} />
                          </div>
                        </div>

                        <SearchableSelect
                          label="Location / Branch:"
                          value={tempLocation}
                          onChange={val => setTempLocation(val)}
                          options={["None (تلقائي حسب قواعد العمل)", "Take from Requester Details (أخذ من بيانات مقدم المعاملة)", "Headquarters HQ", ...(travelZones || []).map((z: any) => z.name)]}
                        />

                        <SearchableSelect
                          label="Brand Unit:"
                          value={tempUnit}
                          onChange={val => setTempUnit(val)}
                          options={["None (تلقائي حسب قواعد العمل)", "Take from Requester Details (أخذ من بيانات مقدم المعاملة)", "Brand Alpha - Retail", "Brand Beta - Corporate", "Brand Gamma - Logistics"]}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <SearchableSelect
                            label="Assigned Group:"
                            value={tempAssignedGroup}
                            onChange={val => setTempAssignedGroup(val)}
                            options={["None (تلقائي حسب قواعد العمل)", "Take from Requester Details (أخذ من بيانات مقدم المعاملة)", ...(businessGroups || []).map((bg: any) => bg.name)]}
                          />
                          <SearchableSelect
                            label="Assigned User:"
                            value={tempAssignedUser}
                            onChange={val => setTempAssignedUser(val)}
                            options={["None (تلقائي حسب قواعد العمل)", ...(users || []).map((u: any) => u.name + (u.role ? ` (${u.role})` : ''))]}
                          />
                        </div>

                        <MultiSearchableSelect
                          label="Observers / CC:"
                          value={tempObservers}
                          onChange={val => setTempObservers(val)}
                          options={["None (تلقائي حسب قواعد العمل)", ...(users || []).map((u: any) => u.name)]}
                          placeholder="Search and select observer..."
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 2 }}>SLA TTO (Takeover):</label>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <input
                                type="number"
                                min={1}
                                className="form-control"
                                style={{ fontSize: 11, padding: '4px', width: '80px', flexShrink: 0 }}
                                value={tempSlaTtoValue}
                                onChange={e => setTempSlaTtoValue(Math.max(1, parseInt(e.target.value) || 1))}
                              />
                              <select
                                className="form-control"
                                style={{ fontSize: 11, padding: '4px', flex: 1 }}
                                value={tempSlaTtoUnit}
                                onChange={e => setTempSlaTtoUnit(e.target.value)}
                              >
                                <option value="Minutes">Minutes</option>
                                <option value="Hours">Hours</option>
                                <option value="Days">Days</option>
                                <option value="Months">Months</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 2 }}>SLA TTR (Resolution):</label>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <input
                                type="number"
                                min={1}
                                className="form-control"
                                style={{ fontSize: 11, padding: '4px', width: '80px', flexShrink: 0 }}
                                value={tempSlaTtrValue}
                                onChange={e => setTempSlaTtrValue(Math.max(1, parseInt(e.target.value) || 1))}
                              />
                              <select
                                className="form-control"
                                style={{ fontSize: 11, padding: '4px', flex: 1 }}
                                value={tempSlaTtrUnit}
                                onChange={e => setTempSlaTtrUnit(e.target.value)}
                              >
                                <option value="Minutes">Minutes</option>
                                <option value="Hours">Hours</option>
                                <option value="Days">Days</option>
                                <option value="Months">Months</option>
                              </select>
                            </div>
                          </div>
                        </div>

                         <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
                          <button type="button" className="btn btn-sm btn-outline" onClick={() => setIsEditingSidebarPanel(false)}>Cancel</button>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={async () => {
                              const nextPanelConfig = {
                                ...panelConfig,
                                customPanelTitle: tempPanelTitle,
                                defaultPriority: tempPriority,
                                defaultUrgency: tempUrgency,
                                defaultImpact: tempImpact,
                                defaultCategory: tempCategory,
                                defaultLocation: tempLocation,
                                defaultUnit: tempUnit,
                                defaultAssignedGroup: tempAssignedGroup,
                                defaultAssignedUser: tempAssignedUser,
                                defaultObservers: tempObservers,
                                defaultSlaTto: `${tempSlaTtoValue} ${tempSlaTtoUnit}`,
                                defaultSlaTtr: `${tempSlaTtrValue} ${tempSlaTtrUnit}`,
                              };
                              setPanelConfig(nextPanelConfig);
                              setIsEditingSidebarPanel(false);
                              if (editId) {
                                try {
                                  await persistForm(nextPanelConfig);
                                } catch (e: any) {
                                  console.warn('[panel save failed]', e);
                                }
                              }
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* SECTION 1: Status & Classification */}
                        {panelConfig.showStatusClassification && (
                          <div style={{ background: "var(--color-bg)", padding: 10, borderRadius: 8, border: "1px solid var(--color-border)" }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase", marginBottom: 6 }}>
                              🏷️ Status & Classification
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
                              <div>Status: <span className="badge pending">PENDING</span></div>
                              <div>Priority: <span className="badge urgent">{String(panelConfig.defaultPriority || 'HIGH').toUpperCase()}</span></div>
                              <div>Impact: <strong>{String(panelConfig.defaultImpact || 'MEDIUM').toUpperCase()}</strong></div>
                              <div>Urgency: <strong>{String(panelConfig.defaultUrgency || 'HIGH').toUpperCase()}</strong></div>
                            </div>
                            <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed var(--color-border)", fontSize: 11 }}>
                              Category: <strong style={{ color: "var(--color-primary)" }}>{panelConfig.defaultCategory || formCategory}</strong>
                            </div>
                          </div>
                        )}

                        {/* SECTION 2: Actors & Assignment */}
                        {panelConfig.showActorsAssignment && (
                          <div style={{ background: "var(--color-bg)", padding: 10, borderRadius: 8, border: "1px solid var(--color-border)" }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase", marginBottom: 6 }}>
                              👤 Actors & Assignment
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700 }}>Requester: [Current Submitting Employee] / [الموظف مقدم المعاملة]</div>
                            <div style={{ fontSize: 11, color: "#4F46E5", marginTop: 4, fontWeight: 700 }}>Group: {panelConfig.defaultAssignedGroup || "IT Support Group"}</div>
                            <div style={{ fontSize: 11, color: "#059669", marginTop: 2, fontWeight: 700 }}>Reviewer: {panelConfig.defaultAssignedUser || "Khaled Samir (Manager)"}</div>
                            <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 4 }}>CC: {panelConfig.defaultObservers || "—"}</div>
                          </div>
                        )}

                        {/* SECTION 3: SLA & Time Targets */}
                        {panelConfig.showSlaMetrics && (
                          <div style={{ background: "var(--color-bg)", padding: 10, borderRadius: 8, border: "1px solid var(--color-border)" }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase", marginBottom: 6 }}>
                              ⏱️ SLA Target Metrics
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
                              <div>TTO SLA: <strong style={{ color: "#10B981" }}>{panelConfig.defaultSlaTto || "1 Hour"}</strong></div>
                              <div>TTR SLA: <strong style={{ color: "#3B82F6" }}>{panelConfig.defaultSlaTtr || "24 Hours"}</strong></div>
                            </div>
                          </div>
                        )}

                        {/* Location / Branch */}
                        {panelConfig.showLocationBranch && (
                          <div style={{ background: "var(--color-bg)", padding: 8, borderRadius: 6, fontSize: 11 }}>
                            📍 Location / Branch: <strong>{panelConfig.defaultLocation || "Headquarters HQ"}</strong>
                          </div>
                        )}

                        {/* Brand Unit */}
                        {panelConfig.showBusinessUnitBrand && (
                          <div style={{ background: "var(--color-bg)", padding: 8, borderRadius: 6, fontSize: 11 }}>
                            🏷️ Brand Unit: <strong style={{ color: "#D97706" }}>{panelConfig.defaultUnit || "Brand Alpha - Retail"}</strong>
                          </div>
                        )}


                      </>
                    )}

                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ── TAB 4: LIVE EMPLOYEE PREVIEW ── */}

      {/* ── TAB 4: LIVE EMPLOYEE PREVIEW ── */}
      {activeTab === "preview" && (
        <div style={{ flex: 1, padding: 30, overflowY: "auto", display: "flex", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: 700, padding: 24, borderRadius: 12, border: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--color-border)", paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 32 }}>{formIcon}</div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{formTitle}</h3>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{formDescription}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {fields.map((field) => {
                const isFull = field.width === "full" || field.type === "transportation_route" || field.type === "section_header" || field.type === "info_notice";
                return (
                  <div key={field.id} style={{ gridColumn: isFull ? "span 2" : "span 1" }}>
                    {field.type !== "section_header" && field.type !== "info_notice" && field.type !== "checkbox" && (
                      <label style={{ fontWeight: 700, fontSize: 12, display: "block", marginBottom: 6 }}>
                        {field.label} {field.required && <span style={{ color: "red" }}>*</span>}
                      </label>
                    )}

                    {field.type === "section_header" && (
                      <div style={{ fontWeight: 900, fontSize: 15, borderBottom: "2px solid var(--color-primary)", paddingBottom: 4, marginTop: 10 }}>
                        📌 {field.label}
                      </div>
                    )}

                    {field.type === "info_notice" && (
                      <div style={{ background: "#FEF3C7", color: "#B45309", padding: 12, borderRadius: 8, fontSize: 12 }}>
                        💡 {field.placeholder || field.label}
                      </div>
                    )}

                    {field.type === "text" && (
                      <input className="form-control" placeholder={field.placeholder} />
                    )}

                    {field.type === "textarea" && (
                      <textarea className="form-control" rows={3} placeholder={field.placeholder} />
                    )}

                    {field.type === "number" && (
                      <input type="number" className="form-control" placeholder={field.placeholder} />
                    )}

                    {field.type === "date" && (
                      <input type="date" className="form-control" />
                    )}

                    {field.type === "select" && (
                      <select className="form-control">
                        <option>{field.placeholder || (lang === "ar" ? "اختر من القائمة..." : "Select...")}</option>
                        {field.optionsList?.map((opt, i) => <option key={i}>{opt}</option>)}
                      </select>
                    )}

                    {field.type === "checkbox" && (
                      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
                        <input type="checkbox" /> {field.label}
                      </label>
                    )}

                    {field.type === "file" && (
                      <input type="file" className="form-control" />
                    )}

                    {field.type === "transportation_route" && (
                      <TransportationRouteControl value={[]} onChange={() => {}} />
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--color-border)", textAlign: lang === "ar" ? "left" : "right" }}>
              <button className="btn btn-primary">
                {lang === "ar" ? "تقديم الطلب الآن ←" : "Submit Request Now →"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function FullFormBuilderPage() {
  return (
    <AuthGuard requiredModule="workflowBuilder" allowRoles={["admin"]}>
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", direction: "rtl" }}>Loading Form Builder...</div>}>
        <FormBuilderInner />
      </Suspense>
    </AuthGuard>
  );
}
