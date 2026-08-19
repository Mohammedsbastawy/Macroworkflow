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
  fetchApiIntegrationsAction,
} from "@/app/actions/workflowActions";
import { fetchEndpointsForIntegrationAction } from "@/app/actions/integrationActions";
import { ExternalIntegrationsPanel, ORACLE_AVAILABLE_COLUMNS, DEFAULT_ORACLE_COLUMNS } from "@/components/tickets/ExternalIntegrationsPanel";
import { WorkflowCanvas } from "@/components/builder/WorkflowCanvas";
import { TransportationRouteControl, type TravelLimits } from "@/components/forms/TransportationRouteControl";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface FormSectionConfig {
  id: string;
  title: string;
  visibility_scope?: "all" | "custom";
  visible_group_ids?: string[];
  visible_dept_ids?: string[];
  visible_user_ids?: string[];
}

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
    | "api_panel"
    | "display_panel"
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
  // Submission Form vs Ticket Detail View Placement
  showInRequestForm?: boolean;
  showInTicketView?: boolean;
  ticketOnly?: boolean;
  // Placement Zone & API Integration Binding
  ticketZone?: "main" | "sidebar" | "header" | "hidden";
  api_integration_id?: string;
  bound_field_key?: string;
  api_search_label?: string;
  api_button_text?: string;
  // Oracle Custom Column Selection & Filter
  oracle_columns?: string[];
  oracle_ownership_filter?: string;
  // API Input Binding
  api_input_enabled?: boolean;
  api_input_integration_id?: string;
  // Field-Level Access Control
  visibility_scope?: "all" | "custom";
  visible_group_ids?: string[];
  visible_dept_ids?: string[];
  visible_user_ids?: string[];
  // Advanced Settings
  autoFillVariable?: "none" | "user_name" | "user_email" | "user_dept" | "user_job" | "user_id" | "current_date" | "auto_ticket_no";
  minNumber?: number;
  maxNumber?: number;
  allowedFileTypes?: string;
  // Travel Route & Allowance optional per-item expense limits (EGP)
  travelLimits?: TravelLimits;
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
  const [loadedSlug, setLoadedSlug] = useState<string>("");
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
  const [fieldEditorTab, setFieldEditorTab] = useState<"basic" | "options" | "api" | "access" | "advanced">("basic");

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
  const [apiIntegrationsList, setApiIntegrationsList] = useState<any[]>([]);
  const [apiEndpointsList, setApiEndpointsList] = useState<any[]>([]);
  const [ticketDesignerDropTarget, setTicketDesignerDropTarget] = useState<string | null>(null);
  const [ticketDesignerPaletteZone, setTicketDesignerPaletteZone] = useState<"main" | "sidebar">("main");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [tab1CollapsedCategories, setTab1CollapsedCategories] = useState<Record<string, boolean>>({});

  const [customSections, setCustomSections] = useState<FormSectionConfig[]>([
    { id: "main_details", title: "Ticket Form Details", visibility_scope: "all" }
  ]);
  const [activeTargetSectionId, setActiveTargetSectionId] = useState<string>("main_details");
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSectionData, setEditingSectionData] = useState<FormSectionConfig | null>(null);

  const TOOLBOX_ITEMS = [
    { type: "text", label: lang === "ar" ? "نص قصير (Short Text)" : "Short Text", icon: "Aa", category: "Basic", color: "#4F46E5" },
    { type: "textarea", label: lang === "ar" ? "نص طويل / تفاصيل (Long Text)" : "Long Text / Notes", icon: "📝", category: "Basic", color: "#4F46E5" },
    { type: "number", label: lang === "ar" ? "رقم / مبلغ (Number)" : "Number / Amount", icon: "#", category: "Basic", color: "#4F46E5" },
    { type: "date", label: lang === "ar" ? "تاريخ (Date Picker)" : "Date Picker", icon: "📅", category: "Basic", color: "#4F46E5" },
    { type: "select", label: lang === "ar" ? "قائمة خيارات (Dropdown)" : "Dropdown List", icon: "📋", category: "Basic", color: "#4F46E5" },
    { type: "checkbox", label: lang === "ar" ? "مربع إقرار / اختيار (Checkbox)" : "Checkbox / Toggle", icon: "☑️", category: "Basic", color: "#4F46E5" },
    { type: "file", label: lang === "ar" ? "إرفاق ملف / مستند (File Upload)" : "File Upload", icon: "📎", category: "Basic", color: "#4F46E5" },
    { type: "display_panel", label: lang === "ar" ? "📦 استدعاء صنف بالأرصدة (Oracle Fetcher)" : "📦 Oracle Item & Stock Fetcher", icon: "📦", category: "Oracle", color: "#C0392B" },
    { type: "transportation_route", label: lang === "ar" ? "📍 خط سير ومصاريف انتقال (Route)" : "📍 Travel Route & Allowance", icon: "🚗", category: "Travel", color: "#EC4899" },
    { type: "glpi_category", label: lang === "ar" ? "📌 تصنيف ونوع المعاملة (Category)" : "📌 Ticket Category", icon: "🏷️", category: "Standard Metrics", color: "#8B5CF6" },
    { type: "glpi_urgency", label: lang === "ar" ? "⚡ مصفوفة الأهمية والتأثير (Urgency)" : "⚡ Urgency & Impact Matrix", icon: "⚡", category: "Standard Metrics", color: "#8B5CF6" },
    { type: "glpi_location", label: lang === "ar" ? "📍 موقع / فرع الخدمة (Service Location)" : "📍 Branch / Site Location", icon: "📍", category: "Standard Metrics", color: "#8B5CF6" },
    { type: "section_header", label: lang === "ar" ? "عنوان قسم فرعي (Section Header)" : "Section Header", icon: "📌", category: "Layout", color: "#F59E0B" },
    { type: "info_notice", label: lang === "ar" ? "مربع تنبيه وإرشادات (Notice Box)" : "Info Notice Box", icon: "💡", category: "Layout", color: "#F59E0B" },
    { type: "user_picker", label: lang === "ar" ? "اختيار موظف / مدير (User Picker)" : "User / Manager Picker", icon: "👤", category: "Advanced", color: "#10B981" },
  ];

  // Load Departments, Groups, and API Integrations
  useEffect(() => {
    fetchOrgHierarchyAction().then(res => setDepartments(res || []));
    fetchBusinessGroupsAction().then(res => setBusinessGroups(res || []));
    fetchSystemUsersAction().then(res => setUsers(res || []));
    fetchTravelZonesAction().then(res => setTravelZones(res || []));
    fetchApiIntegrationsAction().then(res => setApiIntegrationsList(res || []));
    fetchEndpointsForIntegrationAction().then(res => setApiEndpointsList(res || []));
  }, []);

  // Load Existing Form if Editing
  useEffect(() => {
    if (editId) {
      fetchCatalogWorkflowsAction().then(list => {
        const found = list.find((w: any) => w.id === editId || w.slug === editId);
        if (found) {
          setLoadedSlug(found.slug || found.id || editId);
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
            if (found.visibility_rules.custom_sections && Array.isArray(found.visibility_rules.custom_sections) && found.visibility_rules.custom_sections.length > 0) {
              setCustomSections(found.visibility_rules.custom_sections);
              if (found.visibility_rules.custom_sections[0]?.id) {
                setActiveTargetSectionId(found.visibility_rules.custom_sections[0].id);
              }
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
  const addField = (
    item: typeof TOOLBOX_ITEMS[0], 
    targetZone: "main" | "sidebar" = "main", 
    targetSectionId?: string,
    isTicketOnly?: boolean
  ) => {
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

    const assignedSection = targetZone === "sidebar" ? "sidebar" : (targetSectionId || activeTargetSectionId || customSections[0]?.id || "main_details");

    const ticketOnlyFlag = isTicketOnly !== undefined 
      ? isTicketOnly 
      : (activeTab === "ticket_panel" || targetZone === "sidebar" || item.type === "api_panel" || item.type === "display_panel");

    const newField: ExtendedFormField = {
      id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: item.label.split("(")[0].trim(),
      key: item.type.startsWith("glpi_") ? item.type : `field_${Date.now()}`,
      type: item.type as any,
      ticketZone: targetZone,
      visibility_scope: "all",
      section: assignedSection,
      showInRequestForm: !ticketOnlyFlag,
      showInTicketView: true,
      ticketOnly: ticketOnlyFlag,
      width: item.type === "textarea" || item.type === "transportation_route" || item.type === "section_header" || item.type === "info_notice" || item.type === "display_panel" || item.type === "api_panel" ? "full" : "half",
      required: !ticketOnlyFlag,
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

  // Update specific field by ID
  const updateFieldById = (id: string, patch: Partial<ExtendedFormField>) => {
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
    if (editingField?.id === id) {
      setEditingField(prev => prev ? { ...prev, ...patch } : null);
    }
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
        custom_sections: customSections,
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
              title={lang === "ar" ? "الحقول التي يملؤها مقدم الطلب عند إنشاء التكت في البداية" : "Fields filled by requester when creating the request"}
            >
              📝 {lang === "ar" ? `استمارة تقديم الطلب (${fields.filter(f => f.showInRequestForm !== false && !f.ticketOnly && f.ticketZone !== "sidebar").length})` : `Request Submission Form (${fields.filter(f => f.showInRequestForm !== false && !f.ticketOnly && f.ticketZone !== "sidebar").length})`}
            </button>
            <button
              className={`btn btn-sm ${activeTab === "workflow" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("workflow")}
              title={lang === "ar" ? "مسار الموافقات والاعتمادات والشروط" : "Approval Steps & Conditionals"}
            >
              ⚡ {lang === "ar" ? "مسار الاعتماد والشروط" : "Approval Workflow"}
            </button>
            <button
              className={`btn btn-sm ${activeTab === "ticket_panel" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("ticket_panel")}
              title={lang === "ar" ? "تخصيص شكل صفحة المعاملة بعد إنشائها (البوكسات، الصلاحيات، تكاملات أوراكل، واللوحة الجانبية)" : "Design post-creation ticket view, custom review boxes, permissions, and Oracle panels"}
            >
              🖥️ {lang === "ar" ? `صفحة عرض المعاملة والمراجعة (${fields.length})` : `Ticket View & Review Page (${fields.length})`}
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
            
            {/* Grouped Category Accordions for Tab 1 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { id: "Oracle", labelAr: "📦 تكاملات أوراكل (Oracle)", labelEn: "📦 Oracle Integrations", color: "#DC2626" },
                { id: "Basic", labelAr: "📝 الحقول الأساسية (Basic)", labelEn: "📝 Basic Fields", color: "#4F46E5" },
                { id: "Standard Metrics", labelAr: "🏷️ معايير المعاملة (Metrics)", labelEn: "🏷️ Ticket Metrics", color: "#8B5CF6" },
                { id: "Travel", labelAr: "🚗 السفر والانتقال (Travel)", labelEn: "🚗 Travel & Route", color: "#EC4899" },
                { id: "Layout", labelAr: "📌 التنسيق والتنبيهات (Layout)", labelEn: "📌 Layout & Notices", color: "#F59E0B" },
                { id: "Advanced", labelAr: "👤 حقول متقدمة (Advanced)", labelEn: "👤 Advanced", color: "#10B981" },
              ].map(cat => {
                const catItems = TOOLBOX_ITEMS.filter(it => it.category === cat.id);
                if (catItems.length === 0) return null;
                const isCollapsed = tab1CollapsedCategories[cat.id];

                return (
                  <div key={cat.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden", background: "var(--color-bg)" }}>
                    <button
                      type="button"
                      onClick={() => setTab1CollapsedCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "7px 10px",
                        background: "var(--color-surface)",
                        border: "none",
                        borderBottom: isCollapsed ? "none" : "1px solid var(--color-border)",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 800,
                        color: cat.color,
                      }}
                    >
                      <span>{lang === "ar" ? cat.labelAr : cat.labelEn}</span>
                      <span style={{ fontSize: 10 }}>{isCollapsed ? "▼" : "▲"}</span>
                    </button>

                    {!isCollapsed && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 6 }}>
                        {catItems.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addField(item)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "6px 8px",
                              background: "var(--color-surface)",
                              border: "1px solid var(--color-border)",
                              borderRadius: 6,
                              cursor: "pointer",
                              textAlign: lang === "ar" ? "right" : "left",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = cat.color}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}
                          >
                            <span style={{ fontSize: 14 }}>{item.icon}</span>
                            <div style={{ flex: 1, fontWeight: 700, fontSize: 11 }}>{item.label}</div>
                            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>＋</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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

            {/* Fields List for Request Submission Form */}
            {(() => {
              const requestFormFields = fields.filter(f => f.showInRequestForm !== false && !f.ticketOnly && f.ticketZone !== "sidebar");
              
              if (requestFormFields.length === 0) {
                return (
                  <div style={{ padding: 60, textAlign: "center", border: "2px dashed var(--color-border)", borderRadius: 12, background: "var(--color-surface)" }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>
                      {lang === "ar" ? "استمارة تقديم الطلب فارغة حتى الآن" : "The Submission Form is Empty"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                      {lang === "ar" 
                        ? "اضغط على أي حقل من القائمة الجانبية لإضافته هنا إلى الاستمارة التي يملؤها الموظف عند طلب الخدمة." 
                        : "Click any field from the palette to add it to the request form filled by employees."}
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  {requestFormFields.map((field, rIdx) => {
                    const isSelected = editingField?.id === field.id;
                    const isFull = field.width === "full" || field.type === "transportation_route" || field.type === "section_header" || field.type === "info_notice";
                    const realIdx = fields.findIndex(f => f.id === field.id);

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
                          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                            <span>#{rIdx + 1} {field.label} {field.required && <span style={{ color: "red" }}>*</span>}</span>
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              className="btn btn-outline btn-xs"
                              onClick={(e) => { e.stopPropagation(); moveField(realIdx, "up"); }}
                              disabled={rIdx === 0}
                            >▲</button>
                            <button
                              className="btn btn-outline btn-xs"
                              onClick={(e) => { e.stopPropagation(); moveField(realIdx, "down"); }}
                              disabled={rIdx === requestFormFields.length - 1}
                            >▼</button>
                            <button
                              className="btn btn-outline btn-xs"
                              style={{ color: "var(--color-danger)" }}
                              onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                            >🗑</button>
                          </div>
                        </div>

                      {/* Live Field Preview */}
                      {(field.type === "display_panel" || field.type === "api_panel") && (
                         <div>
                           <ExternalIntegrationsPanel
                             isPreview={true}
                             targetApiId={field.api_integration_id}
                             titleOverride={field.label}
                             searchLabel={field.api_search_label || (lang === "ar" ? "خانة البحث والاستعلام المدمجة" : "Integrated Search Query Field")}
                             searchPlaceholder={field.placeholder || (lang === "ar" ? "أدخل الكود/رقم الصنف واضغط Go..." : "Enter item code and click Go...")}
                             buttonText={field.api_button_text || (lang === "ar" ? "Go ➔" : "Go ➔")}
                             visibleColumns={field.oracle_columns}
                             ownershipFilter={field.oracle_ownership_filter}
                           />
                         </div>
                       )}
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
                          <TransportationRouteControl value={[]} onChange={() => {}} limits={field.travelLimits} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
                <div style={{ display: "flex", gap: 3, background: "var(--color-bg)", padding: 3, borderRadius: 6, flexWrap: "wrap" }}>
                  <button
                    className={`btn btn-xs ${fieldEditorTab === "basic" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFieldEditorTab("basic")}
                    style={{ flex: 1, minWidth: 55 }}
                  >
                    {lang === "ar" ? "الأساسية" : "Basic"}
                  </button>
                  {editingField.type === "select" && (
                    <button
                      className={`btn btn-xs ${fieldEditorTab === "options" ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setFieldEditorTab("options")}
                      style={{ flex: 1, minWidth: 55 }}
                    >
                      {lang === "ar" ? "الخيارات" : "Options"}
                    </button>
                  )}
                  <button
                    className={`btn btn-xs ${fieldEditorTab === "api" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFieldEditorTab("api")}
                    style={{ flex: 1, minWidth: 55 }}
                  >
                    🔗 {lang === "ar" ? "الـ API" : "API"}
                  </button>
                  <button
                    className={`btn btn-xs ${fieldEditorTab === "access" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFieldEditorTab("access")}
                    style={{ flex: 1, minWidth: 55 }}
                  >
                    🔒 {lang === "ar" ? "الصلاحية" : "Access"}
                  </button>
                  <button
                    className={`btn btn-xs ${fieldEditorTab === "advanced" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFieldEditorTab("advanced")}
                    style={{ flex: 1, minWidth: 55 }}
                  >
                    ⚙️ {lang === "ar" ? "متقدم" : "Advanced"}
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

                    {/* Placement Zone Selector */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 800, color: "var(--color-primary)", display: "block", marginBottom: 4 }}>
                        📍 {lang === "ar" ? "مكان إظهار الحقل (Placement Zone)" : "Placement Zone"}
                      </label>
                      <select
                        className="form-control"
                        style={{ fontSize: 12, fontWeight: 700, borderColor: "var(--color-primary)" }}
                        value={editingField.ticketZone || "main"}
                        onChange={e => updateEditingField({ ticketZone: e.target.value as any })}
                      >
                        <option value="main">🎨 {lang === "ar" ? "تفاصيل النموذج الرئيسية (Main Form Details)" : "Main Form Details"}</option>
                        <option value="sidebar">📊 {lang === "ar" ? "القائمة الجانبية للتذكرة (Ticket Info Panel)" : "Ticket Info Panel (Sidebar)"}</option>
                        <option value="header">📌 {lang === "ar" ? "شريط هيدر التذكرة (Header Banner)" : "Header Banner"}</option>
                        <option value="hidden">🔒 {lang === "ar" ? "مخفي للمنطق فقط (Hidden)" : "Hidden"}</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 12px", background: "var(--color-bg)", borderRadius: 6, border: "1px solid var(--color-border)", marginTop: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-primary)" }}>
                        👁️ {lang === "ar" ? "مراحل وأماكن ظهور الحقل:" : "Field Visibility Stages:"}
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={editingField.showInRequestForm !== false && !editingField.ticketOnly}
                          onChange={e => updateEditingField({ 
                            showInRequestForm: e.target.checked,
                            ticketOnly: !e.target.checked
                          })}
                        />
                        📝 {lang === "ar" ? "يظهر في استمارة تقديم الطلب التي يملؤها الموظف (/requests/new)" : "Show in Request Submission Form"}
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={editingField.showInTicketView !== false}
                          onChange={e => updateEditingField({ showInTicketView: e.target.checked })}
                        />
                        🖥️ {lang === "ar" ? "يظهر في صفحة عرض ومراجعة المعاملة بعد إنشائها (/requests/[id])" : "Show in Post-Creation Ticket View"}
                      </label>
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                      <input
                        type="checkbox"
                        checked={editingField.required}
                        onChange={e => updateEditingField({ required: e.target.checked })}
                      />
                      {lang === "ar" ? "حقل إجباري (Required Field)" : "Required Field"}
                    </label>
                  </div>
                )}

                {/* TAB: API INTEGRATION BINDING */}
                {fieldEditorTab === "api" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {editingField.type === "display_panel" || editingField.type === "api_panel" ? (
                      <div style={{ background: "#EFF6FF", padding: 12, borderRadius: 8, border: "1px solid #BFDBFE", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#1E40AF" }}>
                          📦 {lang === "ar" ? "إعدادات استدعاء الصنف (Oracle Settings)" : "Oracle Item Fetcher Settings"}
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", display: "block", marginBottom: 2 }}>
                            {lang === "ar" ? "اختر نظام الـ API المستهدف:" : "Select Target API Integration:"}
                          </label>
                          <select
                            className="form-control"
                            style={{ fontSize: 11 }}
                            value={editingField.api_integration_id || ""}
                            onChange={e => updateEditingField({ api_integration_id: e.target.value })}
                          >
                            <option value="">-- {lang === "ar" ? "اختر نظام التكامل" : "Select Active API Integration"} --</option>

                            <optgroup label={lang === "ar" ? "🔌 الأنظمة العامة (System Integrations)" : "🔌 System Integrations"}>
                              {apiIntegrationsList.map((api: any) => (
                                <option key={api.id} value={api.id}>
                                  🔌 {api.name} ({api.provider})
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", display: "block", marginBottom: 2 }}>
                            {lang === "ar" ? "تصفية نوع الملكية (Ownership Filter):" : "Ownership Filter:"}
                          </label>
                          <select
                            className="form-control"
                            style={{ fontSize: 11, fontWeight: 600 }}
                            value={editingField.oracle_ownership_filter || "all"}
                            onChange={e => updateEditingField({ oracle_ownership_filter: e.target.value })}
                          >
                            <option value="all">{lang === "ar" ? "🌐 كل الملكيات (All - Owned & Consigned)" : "All (Owned & Consigned)"}</option>
                            <option value="owned">{lang === "ar" ? "🏢 مملوك فقط (Owned Only)" : "Owned Only"}</option>
                            <option value="consigned">{lang === "ar" ? "🤝 أمانة / موردين فقط (Consigned Only)" : "Consigned Only"}</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", display: "block", marginBottom: 4 }}>
                            {lang === "ar" ? "الأعمدة المراد عرضها في جدول الأرصدة:" : "Visible Stock Table Columns:"}
                          </label>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 5, background: "#fff", padding: 8, borderRadius: 6, border: "1px solid #BFDBFE", maxHeight: 180, overflowY: "auto" }}>
                            {ORACLE_AVAILABLE_COLUMNS.map(col => {
                              const currentCols = editingField.oracle_columns || DEFAULT_ORACLE_COLUMNS;
                              const isChecked = currentCols.includes(col.id);
                              return (
                                <label key={col.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer" }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      let updated: string[];
                                      if (e.target.checked) {
                                        updated = [...currentCols, col.id];
                                      } else {
                                        updated = currentCols.filter((c: string) => c !== col.id);
                                      }
                                      updateEditingField({ oracle_columns: updated });
                                    }}
                                  />
                                  <span style={{ fontWeight: isChecked ? 700 : 400, color: isChecked ? "#1E40AF" : "inherit" }}>
                                    {lang === "ar" ? col.labelAr : col.labelEn}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", display: "block", marginBottom: 2 }}>
                            {lang === "ar" ? "عنوان حقل البحث المدمج (Search Field Label):" : "Integrated Search Field Label:"}
                          </label>
                          <input
                            className="form-control"
                            style={{ fontSize: 11 }}
                            value={editingField.api_search_label || ""}
                            onChange={e => updateEditingField({ api_search_label: e.target.value })}
                            placeholder={lang === "ar" ? "أدخل كود/رقم الصنف..." : "e.g. Enter item code..."}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", display: "block", marginBottom: 2 }}>
                            {lang === "ar" ? "نص زر التشغيل والبحث (Action Button Text):" : "Action Button Text:"}
                          </label>
                          <input
                            className="form-control"
                            style={{ fontSize: 11, fontWeight: 700 }}
                            value={editingField.api_button_text || ""}
                            onChange={e => updateEditingField({ api_button_text: e.target.value })}
                            placeholder="Go ➔"
                          />
                        </div>

                        <div style={{ fontSize: 10, color: "#3B82F6", padding: 8, background: "#DBEAFE", borderRadius: 6, border: "1px solid #BFDBFE", fontWeight: 700 }}>
                          💡 {lang === "ar" 
                            ? "هذا المربع مدمج بالكامل: يحتوي على خانة إدخال، زر Go، ومربع عرض التجهيز الفوري للـ GET API دون الحاجة لربطه بخانات خارجية."
                            : "Self-contained widget: includes search input, Go button, and live GET API results panel."}
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: "#F0FDF4", padding: 12, borderRadius: 8, border: "1px solid #BBF7D0", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#166534" }}>
                          🔗 {lang === "ar" ? "تفعيل الحقل كمُدخل للـ API (API Input Binding)" : "API Input Field Binding"}
                        </div>

                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                          <input
                            type="checkbox"
                            checked={editingField.api_input_enabled || false}
                            onChange={e => updateEditingField({ api_input_enabled: e.target.checked })}
                          />
                          {lang === "ar" ? "ربط هذا الحقل بـ API واستخدامه كـ Parameter" : "Enable API binding for this input field"}
                        </label>

                        {editingField.api_input_enabled && (
                          <div style={{ marginTop: 4 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "#166534", display: "block", marginBottom: 2 }}>
                              {lang === "ar" ? "اختر الـ API الذي سيتلقى قيمة هذا الحقل:" : "Target API Integration:"}
                            </label>
                            <select
                              className="form-control"
                              style={{ fontSize: 11 }}
                              value={editingField.api_input_integration_id || ""}
                              onChange={e => updateEditingField({ api_input_integration_id: e.target.value })}
                            >
                              <option value="">-- {lang === "ar" ? "اختر الـ API أو الـ Endpoint" : "Select Target API"} --</option>
                              
                              {apiEndpointsList.length > 0 && (
                                <optgroup label={lang === "ar" ? "📍 الـ Endpoints والعمليات المحددة" : "📍 Configured Endpoints"}>
                                  {apiEndpointsList.map((ep: any) => (
                                    <option key={ep.id} value={ep.id}>
                                      ⚡ [{ep.http_method}] {ep.integration_name ? `${ep.integration_name} → ` : ""}{ep.name} ({ep.path})
                                    </option>
                                  ))}
                                </optgroup>
                              )}

                              <optgroup label={lang === "ar" ? "🔌 الأنظمة العامة (System Integrations)" : "🔌 System Integrations"}>
                                {apiIntegrationsList.map((api: any) => (
                                  <option key={api.id} value={api.id}>
                                    🔌 {api.name} ({api.provider})
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: FIELD ACCESS CONTROL & VISIBILITY */}
                {fieldEditorTab === "access" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-primary)" }}>
                      🔒 {lang === "ar" ? "صلاحية مشاهدة واستخدام الحقل (Field Access Control)" : "Field Level Access Control"}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11 }}>
                        <input
                          type="radio"
                          name={`fieldVis_${editingField.id}`}
                          checked={editingField.visibility_scope !== "custom"}
                          onChange={() => updateEditingField({ visibility_scope: "all" })}
                        />
                        🌐 {lang === "ar" ? "متاح للجميع (All Users)" : "Available to All Users"}
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11 }}>
                        <input
                          type="radio"
                          name={`fieldVis_${editingField.id}`}
                          checked={editingField.visibility_scope === "custom"}
                          onChange={() => updateEditingField({ visibility_scope: "custom" })}
                        />
                        🔒 {lang === "ar" ? "تخصيص صلاحيات لـ مجموعات / أقسام / أشخاص محددين" : "Specific Groups, Departments, or Users"}
                      </label>
                    </div>

                    {editingField.visibility_scope === "custom" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4, background: "var(--color-bg)", padding: 10, borderRadius: 8, border: "1px solid var(--color-border)" }}>
                        {/* Groups */}
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 800, display: "block", marginBottom: 4 }}>
                            👥 {lang === "ar" ? "مجموعات العمل المسموح لها:" : "Target Groups:"}
                          </label>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 100, overflowY: "auto", fontSize: 11 }}>
                            {businessGroups.map(g => (
                              <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={(editingField.visible_group_ids || []).includes(g.id)}
                                  onChange={e => {
                                    const current = editingField.visible_group_ids || [];
                                    const updated = e.target.checked
                                      ? [...current, g.id]
                                      : current.filter(id => id !== g.id);
                                    updateEditingField({ visible_group_ids: updated });
                                  }}
                                />
                                {g.name}
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Departments */}
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 800, display: "block", marginBottom: 4 }}>
                            🏢 {lang === "ar" ? "الأقسام المسموح لها:" : "Target Departments:"}
                          </label>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 100, overflowY: "auto", fontSize: 11 }}>
                            {departments.map(d => (
                              <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={(editingField.visible_dept_ids || []).includes(d.id)}
                                  onChange={e => {
                                    const current = editingField.visible_dept_ids || [];
                                    const updated = e.target.checked
                                      ? [...current, d.id]
                                      : current.filter(id => id !== d.id);
                                    updateEditingField({ visible_dept_ids: updated });
                                  }}
                                />
                                {d.name}
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Users */}
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 800, display: "block", marginBottom: 4 }}>
                            👤 {lang === "ar" ? "أشخاص محددون:" : "Specific Users:"}
                          </label>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 100, overflowY: "auto", fontSize: 11 }}>
                            {users.map(u => (
                              <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={(editingField.visible_user_ids || []).includes(u.id)}
                                  onChange={e => {
                                    const current = editingField.visible_user_ids || [];
                                    const updated = e.target.checked
                                      ? [...current, u.id]
                                      : current.filter(id => id !== u.id);
                                    updateEditingField({ visible_user_ids: updated });
                                  }}
                                />
                                {u.name} ({u.role})
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
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

                    {editingField.type === "transportation_route" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px dashed var(--color-border)", paddingTop: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>📏 {lang === "ar" ? "سقوف المصاريف لكل بند (بالجنية المصري)" : "Per-Item Expense Limits (EGP)"}</div>
                        <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                          {lang === "ar"
                            ? "اترك الخانة فارغة لعدم وجود سقف. عند تجاوز الموظف للسقف يظهر تنبيه بأنه تجاوز الحد المسموح دون كشف قيمته."
                            : "Leave blank for no limit. When an employee exceeds a limit, a warning appears without revealing its value."}
                        </div>
                        {[
                          { key: "meal", label: "🍔 وجبات" },
                          { key: "coffee", label: "☕ قهوة" },
                          { key: "parking", label: "🅿️ باركينج" },
                          { key: "correspondence", label: "✉️ مراسلات" },
                          { key: "ticketCost", label: "🎟️ تذكرة سفر" },
                        ].map(cfg => (
                          <div key={cfg.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 150, fontSize: 11, fontWeight: 700 }}>{cfg.label} (ج.م)</span>
                            <input
                              type="number"
                              className="form-control"
                              style={{ fontSize: 12 }}
                              placeholder={lang === "ar" ? "بدون سقف" : "No limit"}
                              value={editingField.travelLimits?.[cfg.key as keyof TravelLimits] ?? ""}
                              onChange={e => {
                                const v = e.target.value;
                                const next = { ...(editingField.travelLimits || {}) } as TravelLimits;
                                if (v === "") delete next[cfg.key as keyof TravelLimits];
                                else next[cfg.key as keyof TravelLimits] = Number(v);
                                updateEditingField({ travelLimits: next });
                              }}
                            />
                          </div>
                        ))}
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
      {activeTab === "workflow" && (
        <div style={{ flex: 1, position: "relative", minHeight: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 20px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-primary)" }}>
                ⚡ {lang === "ar" ? "مصمم مسار الموافقات والشروط (Visual Approval Canvas)" : "Visual Approval Workflow Canvas"}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                {lang === "ar" ? "اسحب وأفلت خطوات الاعتماد، الشروط الذكية، والإشعارات لربطها بهذه الاستمارة." : "Drag & drop approval steps, conditional gates, and webhooks linked to this form."}
              </div>
            </div>
            <span className="badge info">
              {lang === "ar" ? "متزامن مع الاستمارة" : "Synced with Form"}
            </span>
          </div>
          <div style={{ flex: 1, position: "relative", minHeight: "calc(100vh - 180px)" }}>
            <WorkflowCanvas workflowSlug={loadedSlug || editId || `wf-${formTitle.toLowerCase().replace(/[^a-z0-9]/g, "-") || "custom"}`} />
          </div>
        </div>
      )}

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

            {/* 2. MAIN 3-COLUMN TICKET LAYOUT */}
            <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 350px", gap: 16 }}>
              
              {/* LEFT TOOLBOX PALETTE: Drag & Drop + Add to Main / Sidebar */}
              <div style={{ background: "var(--color-surface)", padding: 14, borderRadius: 10, border: "1px solid var(--color-primary)", display: "flex", flexDirection: "column", gap: 10, maxHeight: 750, overflowY: "auto" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>➕ {lang === "ar" ? "إضافة حقول للمعاملة:" : "Add Field to Ticket:"}</span>
                  <span style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600 }}>✋ Drag & Drop</span>
                </div>

                {/* Target Zone Quick Selector */}
                <div style={{ display: "flex", gap: 4, background: "var(--color-bg)", padding: 3, borderRadius: 8, border: "1px solid var(--color-border)" }}>
                  <button
                    type="button"
                    onClick={() => setTicketDesignerPaletteZone("main")}
                    style={{
                      flex: 1,
                      padding: "5px 6px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      background: ticketDesignerPaletteZone === "main" ? "var(--color-primary)" : "transparent",
                      color: ticketDesignerPaletteZone === "main" ? "#fff" : "var(--color-text-secondary)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    📝 {lang === "ar" ? "جسم المعاملة" : "Main Body"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketDesignerPaletteZone("sidebar")}
                    style={{
                      flex: 1,
                      padding: "5px 6px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      background: ticketDesignerPaletteZone === "sidebar" ? "var(--color-primary)" : "transparent",
                      color: ticketDesignerPaletteZone === "sidebar" ? "#fff" : "var(--color-text-secondary)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    📊 {lang === "ar" ? "اللوحة الجانبية" : "Sidebar"}
                  </button>
                </div>

                {/* Target Section Selector when in Main Body Mode */}
                {ticketDesignerPaletteZone === "main" && (
                  <div style={{ background: "var(--color-bg)", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontSize: 10, fontWeight: 800, color: "var(--color-primary)" }}>
                        📌 {lang === "ar" ? "البوكس المستهدف للإضافة:" : "Target Box / Card:"}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSectionData({ id: `sec-${Date.now()}`, title: lang === "ar" ? `قسم مخصص ${customSections.length + 1}` : `Custom Card ${customSections.length + 1}`, visibility_scope: "all" });
                          setSectionModalOpen(true);
                        }}
                        style={{ fontSize: 9, fontWeight: 800, color: "var(--color-primary)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}
                      >
                        + {lang === "ar" ? "بوكس جديد" : "New Box"}
                      </button>
                    </div>
                    <select
                      className="form-control"
                      style={{ fontSize: 11, padding: "3px 6px", fontWeight: 700 }}
                      value={activeTargetSectionId}
                      onChange={e => setActiveTargetSectionId(e.target.value)}
                    >
                      {customSections.map(sec => (
                        <option key={sec.id} value={sec.id}>
                          {sec.title} {sec.visibility_scope === "custom" ? "🔒 (مخصص)" : "🌐 (للجميع)"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ fontSize: 10, color: "var(--color-text-muted)", lineHeight: 1.3 }}>
                  💡 {lang === "ar" 
                    ? "اسحب أي حقل وأفلته في أي بوكس، أو اضغط على الأزرار السريعة [+ Main] أو [+ Side]:" 
                    : "Drag any field to drop in any Box or Sidebar, or click the quick add buttons:"}
                </div>

                {/* Grouped Category Accordions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { id: "Oracle", labelAr: "📦 تكاملات أوراكل (Oracle)", labelEn: "📦 Oracle Integrations", color: "#DC2626" },
                    { id: "Basic", labelAr: "📝 الحقول الأساسية (Basic)", labelEn: "📝 Basic Fields", color: "#4F46E5" },
                    { id: "Standard Metrics", labelAr: "🏷️ معايير المعاملة (Metrics)", labelEn: "🏷️ Ticket Metrics", color: "#8B5CF6" },
                    { id: "Travel", labelAr: "🚗 السفر والانتقال (Travel)", labelEn: "🚗 Travel & Route", color: "#EC4899" },
                    { id: "Layout", labelAr: "📌 التنسيق والتنبيهات (Layout)", labelEn: "📌 Layout & Notices", color: "#F59E0B" },
                    { id: "Advanced", labelAr: "👤 حقول متقدمة (Advanced)", labelEn: "👤 Advanced", color: "#10B981" },
                  ].map(cat => {
                    const catItems = TOOLBOX_ITEMS.filter(it => it.category === cat.id);
                    if (catItems.length === 0) return null;
                    const isCollapsed = collapsedCategories[cat.id];

                    return (
                      <div key={cat.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden", background: "var(--color-bg)" }}>
                        <button
                          type="button"
                          onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                          style={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "6px 10px",
                            background: "var(--color-surface)",
                            border: "none",
                            borderBottom: isCollapsed ? "none" : "1px solid var(--color-border)",
                            cursor: "pointer",
                            fontSize: 10,
                            fontWeight: 800,
                            color: cat.color,
                          }}
                        >
                          <span>{lang === "ar" ? cat.labelAr : cat.labelEn}</span>
                          <span style={{ fontSize: 10 }}>{isCollapsed ? "▼" : "▲"}</span>
                        </button>

                        {!isCollapsed && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 6 }}>
                            {catItems.map((item, idx) => (
                              <div
                                key={idx}
                                draggable={true}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("application/json", JSON.stringify(item));
                                  e.dataTransfer.effectAllowed = "copy";
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  padding: "5px 6px",
                                  background: "var(--color-surface)",
                                  border: "1px solid var(--color-border)",
                                  borderRadius: 6,
                                  cursor: "grab",
                                  fontSize: 11,
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = cat.color}
                                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}
                                title={lang === "ar" ? "اسحب وأفلت هذا الحقل في المكان المطلوب" : "Drag and drop this field anywhere"}
                              >
                                <span style={{ cursor: "grab", color: "var(--color-text-muted)", fontSize: 12 }}>⋮⋮</span>
                                <span style={{ fontSize: 13 }}>{item.icon}</span>
                                <span
                                  onClick={() => addField(item, ticketDesignerPaletteZone, activeTargetSectionId)}
                                  style={{ flex: 1, fontWeight: 700, fontSize: 10, cursor: "pointer" }}
                                  title={lang === "ar" ? `اضغط للإضافة إلى ${ticketDesignerPaletteZone === "main" ? "جسم المعاملة" : "اللوحة الجانبية"}` : `Click to add to ${ticketDesignerPaletteZone}`}
                                >
                                  {item.label.split("(")[0]}
                                </span>
                                
                                {/* Dual Quick Add Buttons */}
                                <div style={{ display: "flex", gap: 2 }}>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); addField(item, "main", activeTargetSectionId); }}
                                    style={{ padding: "2px 5px", fontSize: 9, fontWeight: 800, background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 4, cursor: "pointer" }}
                                    title={lang === "ar" ? "إضافة لجسم المعاملة" : "Add to Main"}
                                  >
                                    +Main
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); addField(item, "sidebar"); }}
                                    style={{ padding: "2px 5px", fontSize: 9, fontWeight: 800, background: "#F5F3FF", color: "#7C3AED", border: "1px solid #DDD6FE", borderRadius: 4, cursor: "pointer" }}
                                    title={lang === "ar" ? "إضافة للوحة الجانبية" : "Add to Sidebar"}
                                  >
                                    +Side
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MIDDLE COLUMN: DYNAMIC CUSTOM CARDS / SECTIONS */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                
                {/* Custom Box Action Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>📑 {lang === "ar" ? "أقسام وبوكسات المعاملة:" : "Ticket Sections & Boxes:"}</span>
                    <span className="tag primary">{customSections.length} {lang === "ar" ? "بوكس" : "Cards"}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setEditingSectionData({ id: `sec-${Date.now()}`, title: lang === "ar" ? `قسم مخصص ${customSections.length + 1}` : `Custom Card ${customSections.length + 1}`, visibility_scope: "all" });
                      setSectionModalOpen(true);
                    }}
                    style={{ fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 4, padding: "5px 12px" }}
                  >
                    <span>➕</span>
                    <span>{lang === "ar" ? "إضافة بوكس / قسم جديد" : "Add New Box / Card"}</span>
                  </button>
                </div>

                {/* Render Each Section / Box */}
                {customSections.map((section, sIdx) => {
                  const sectionFields = fields.filter(f => {
                    if (f.ticketZone === "sidebar" || f.ticketZone === "hidden") return false;
                    if (f.section === section.id || f.section === section.title) return true;
                    const matchesOther = customSections.some(o => o.id !== section.id && (f.section === o.id || f.section === o.title));
                    if (sIdx === 0 && !matchesOther) return true;
                    return false;
                  });
                  const isDropTarget = ticketDesignerDropTarget === section.id;

                  return (
                    <div
                      key={section.id}
                      className="card"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "copy";
                        if (ticketDesignerDropTarget !== section.id) setTicketDesignerDropTarget(section.id);
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setTicketDesignerDropTarget(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setTicketDesignerDropTarget(null);
                        const rawData = e.dataTransfer.getData("application/json");
                        if (rawData) {
                          try {
                            const item = JSON.parse(rawData);
                            addField(item, "main", section.id);
                          } catch (err) {}
                        }
                      }}
                      style={{
                        border: isDropTarget ? "2px dashed var(--color-primary)" : "1px solid var(--color-border)",
                        background: isDropTarget ? "rgba(79, 70, 229, 0.04)" : "var(--color-surface)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span>📝 {section.title}</span>
                          {section.visibility_scope === "custom" ? (
                            <span className="badge warning" style={{ fontSize: 10 }}>
                              🔒 {lang === "ar" ? "صلاحيات مخصصة" : "Custom Visibility"}
                            </span>
                          ) : (
                            <span className="badge" style={{ fontSize: 10, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>
                              🌐 {lang === "ar" ? "مرئي للجميع" : "Visible to All"}
                            </span>
                          )}
                          {isDropTarget && (
                            <span style={{ fontSize: 10, color: "var(--color-primary)", fontWeight: 900, background: "#EEF2FF", padding: "2px 8px", borderRadius: 10 }}>
                              📥 {lang === "ar" ? `أفلت الحقل هنا في (${section.title})!` : `Drop Field into ${section.title}!`}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="tag">
                            {sectionFields.length} {lang === "ar" ? "حقول" : "Fields"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSectionData({ ...section });
                              setSectionModalOpen(true);
                            }}
                            style={{ padding: "2px 8px", fontSize: 10, fontWeight: 700, background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 4, cursor: "pointer" }}
                            title={lang === "ar" ? "تعديل اسم البوكس والصلاحيات (من يراه)" : "Edit Box Name & Visibility Permissions"}
                          >
                            ⚙️ {lang === "ar" ? "تعديل والصلاحيات" : "Permissions"}
                          </button>
                          {customSections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا البوكس؟ سيتم نقل حقوله للبوكس الأول." : "Delete this card? Its fields will be moved to the primary card.")) {
                                  const fallbackId = customSections.find(s => s.id !== section.id)?.id || "main_details";
                                  setFields(prev => prev.map(f => (f.section === section.id || f.section === section.title) ? { ...f, section: fallbackId } : f));
                                  setCustomSections(prev => prev.filter(s => s.id !== section.id));
                                  if (activeTargetSectionId === section.id) setActiveTargetSectionId(fallbackId);
                                }
                              }}
                              style={{ padding: "2px 6px", fontSize: 10, fontWeight: 700, background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA", borderRadius: 4, cursor: "pointer" }}
                              title={lang === "ar" ? "حذف هذا البوكس" : "Delete this box"}
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="card-body">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                          {sectionFields.length > 0 ? (
                            sectionFields.map((field) => {
                              const isFull = field.width === "full" || field.type === "api_panel" || field.type === "display_panel" || field.type === "transportation_route" || field.type === "textarea" || field.type === "section_header" || field.type === "info_notice";
                              const isSelected = editingField?.id === field.id;

                              return (
                                <div
                                  key={field.id}
                                  style={{
                                    gridColumn: isFull ? "1 / -1" : "auto",
                                    position: "relative",
                                    padding: 10,
                                    borderRadius: 8,
                                    background: isSelected ? "var(--color-primary-light)" : "var(--color-bg)",
                                    border: isSelected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  {/* Field Action Bar on Top */}
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-primary)" }}>
                                      {field.label}
                                    </div>
                                    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                                      {/* Toggle Request Form vs Ticket Only */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const willShow = field.showInRequestForm === false || field.ticketOnly === true;
                                          updateFieldById(field.id, {
                                            showInRequestForm: willShow,
                                            ticketOnly: !willShow,
                                          });
                                        }}
                                        style={{
                                          padding: "2px 6px",
                                          fontSize: 9,
                                          fontWeight: 800,
                                          borderRadius: 4,
                                          border: (field.showInRequestForm !== false && !field.ticketOnly) ? "1px solid #BBF7D0" : "1px solid #E2E8F0",
                                          background: (field.showInRequestForm !== false && !field.ticketOnly) ? "#F0FDF4" : "#F8FAFC",
                                          color: (field.showInRequestForm !== false && !field.ticketOnly) ? "#15803D" : "#64748B",
                                          cursor: "pointer",
                                        }}
                                        title={lang === "ar" ? "تحديد ما إذا كان هذا الحقل سيظهر للموظف أثناء تقديم الطلب أيضاً أم خاص بصفحة المعاملة فقط" : "Toggle whether field appears in submission form or ticket review only"}
                                      >
                                        {(field.showInRequestForm !== false && !field.ticketOnly) 
                                          ? (lang === "ar" ? "📝 في الاستمارة" : "📝 In Form") 
                                          : (lang === "ar" ? "🔒 للمعاملة فقط" : "🔒 Ticket Only")}
                                      </button>

                                      {/* Move to another Section Dropdown */}
                                      {customSections.length > 1 && (
                                        <select
                                          style={{ fontSize: 9, padding: "1px 4px", borderRadius: 4, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontWeight: 700 }}
                                          value={field.section || section.id}
                                          onChange={(e) => updateFieldById(field.id, { section: e.target.value })}
                                          title={lang === "ar" ? "نقل الحقل إلى بوكس آخر" : "Move field to another box"}
                                        >
                                          {customSections.map(s => (
                                            <option key={s.id} value={s.id}>
                                              📂 {s.title}
                                            </option>
                                          ))}
                                        </select>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => setEditingField(field)}
                                        style={{ padding: "2px 5px", fontSize: 10, fontWeight: 700, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 4, cursor: "pointer" }}
                                        title={lang === "ar" ? "تعديل إعدادات الحقل" : "Edit Field Settings"}
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateFieldById(field.id, { ticketZone: "sidebar" })}
                                        style={{ padding: "2px 5px", fontSize: 9, fontWeight: 700, background: "#F5F3FF", color: "#7C3AED", border: "1px solid #DDD6FE", borderRadius: 4, cursor: "pointer" }}
                                        title={lang === "ar" ? "نقل إلى اللوحة الجانبية" : "Move to Sidebar"}
                                      >
                                        ➡️ Side
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteField(field.id)}
                                        style={{ padding: "2px 5px", fontSize: 10, fontWeight: 700, background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA", borderRadius: 4, cursor: "pointer" }}
                                        title={lang === "ar" ? "حذف الحقل" : "Delete Field"}
                                      >
                                        🗑
                                      </button>
                                    </div>
                                  </div>

                                  {/* Render Field Component Preview */}
                                  {(field.type === "display_panel" || field.type === "api_panel") ? (
                                    <div>
                                      <ExternalIntegrationsPanel
                                        isPreview={true}
                                        targetApiId={field.api_integration_id}
                                        titleOverride={field.label}
                                        searchLabel={field.api_search_label || (lang === "ar" ? "خانة البحث والاستعلام المدمجة" : "Integrated Search Query Field")}
                                        searchPlaceholder={field.placeholder || (lang === "ar" ? "أدخل الكود/رقم الصنف واضغط Go..." : "Enter item code and click Go...")}
                                        buttonText={field.api_button_text || "Go ➔"}
                                        visibleColumns={field.oracle_columns}
                                        ownershipFilter={field.oracle_ownership_filter}
                                      />
                                    </div>
                                  ) : field.type === "section_header" ? (
                                    <div style={{ fontWeight: 900, fontSize: 13, color: "var(--color-primary)", borderBottom: "2px solid var(--color-primary)", paddingBottom: 4 }}>
                                      📌 {field.label}
                                    </div>
                                  ) : field.type === "info_notice" ? (
                                    <div style={{ background: "#FEF3C7", color: "#B45309", padding: 10, borderRadius: 6, fontSize: 11 }}>
                                      💡 {field.placeholder || field.label}
                                    </div>
                                  ) : field.type === "transportation_route" ? (
                                    <div style={{ padding: 12, background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 11 }}>
                                      🚗 {lang === "ar" ? "جدول خط السير وبدلات الانتقال المجمعة (Travel Route Control)" : "Travel Route & Financial Allowance Table"}
                                    </div>
                                  ) : field.type === "select" ? (
                                    <select className="form-control" style={{ fontSize: 11 }} disabled>
                                      <option>{field.placeholder || (lang === "ar" ? "اختر من القائمة..." : "Select option...")}</option>
                                      {field.optionsList?.map((opt, oi) => <option key={oi}>{opt}</option>)}
                                    </select>
                                  ) : field.type === "textarea" ? (
                                    <textarea className="form-control" rows={2} style={{ fontSize: 11 }} placeholder={field.placeholder} disabled />
                                  ) : field.type === "checkbox" ? (
                                    <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11 }}>
                                      <input type="checkbox" disabled /> {field.label}
                                    </label>
                                  ) : field.type === "file" ? (
                                    <div style={{ border: "1px dashed var(--color-border)", padding: 8, textAlign: "center", fontSize: 11, color: "var(--color-text-muted)", borderRadius: 6 }}>
                                      📎 {lang === "ar" ? "مرفقات ومستندات الطلب" : "Uploaded Attachment Documents"}
                                    </div>
                                  ) : (
                                    <input className="form-control" style={{ fontSize: 11 }} placeholder={field.placeholder || (lang === "ar" ? "قيمة الحقل التجريبية" : "Sample value")} disabled />
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div
                              style={{
                                gridColumn: "1 / -1",
                                padding: 24,
                                textAlign: "center",
                                border: "2px dashed var(--color-border)",
                                borderRadius: 10,
                                color: "var(--color-text-muted)",
                                fontSize: 11,
                              }}
                            >
                              <div style={{ fontSize: 24, marginBottom: 4 }}>📥</div>
                              <strong>{lang === "ar" ? `اسحب وأفلت الحقول هنا للإضافة إلى (${section.title})` : `Drag & drop fields here to add to (${section.title})`}</strong>
                              <div style={{ fontSize: 10, marginTop: 2 }}>{lang === "ar" ? "أو حدد هذا البوكس من القائمة اليسرى واضغط [+ Main]." : "Or select this box on the left and click [+ Main]."}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

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

              {/* RIGHT SIDEBAR TICKET INFO PANEL (Drop Zone for Sidebar Fields) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div
                  className="card"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                    if (ticketDesignerDropTarget !== "sidebar") setTicketDesignerDropTarget("sidebar");
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setTicketDesignerDropTarget(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setTicketDesignerDropTarget(null);
                    const rawData = e.dataTransfer.getData("application/json");
                    if (rawData) {
                      try {
                        const item = JSON.parse(rawData);
                        addField(item, "sidebar");
                      } catch (err) {}
                    }
                  }}
                  style={{
                    border: ticketDesignerDropTarget === "sidebar" ? "2px dashed #7C3AED" : "2px solid var(--color-primary)",
                    background: ticketDesignerDropTarget === "sidebar" ? "rgba(124, 58, 237, 0.04)" : "var(--color-surface)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="card-title" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>📊 {panelConfig.customPanelTitle}</span>
                      {ticketDesignerDropTarget === "sidebar" && (
                        <span style={{ fontSize: 10, color: "#7C3AED", fontWeight: 900, background: "#F5F3FF", padding: "2px 6px", borderRadius: 8 }}>
                          📥 {lang === "ar" ? "أفلت هنا!" : "Drop Here!"}
                        </span>
                      )}
                    </div>
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

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => setIsEditingSidebarPanel(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
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

                        {/* Custom Sidebar Form Fields */}
                        <div style={{ background: "var(--color-bg)", padding: 10, borderRadius: 8, border: "1px solid var(--color-primary)", marginTop: 4 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>📊 {lang === "ar" ? "حقول القائمة الجانبية المخصصة" : "Custom Sidebar Form Fields"}</span>
                            <span className="tag" style={{ fontSize: 9 }}>{fields.filter(f => f.ticketZone === "sidebar").length}</span>
                          </div>
                          
                          {fields.filter(f => f.ticketZone === "sidebar").length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {fields.filter(f => f.ticketZone === "sidebar").map(field => (
                                <div key={field.id} style={{ background: "var(--color-surface)", padding: 6, borderRadius: 6, border: "1px solid var(--color-border)" }}>
                                  <div style={{ fontSize: 9, color: "var(--color-text-muted)", fontWeight: 700 }}>{field.label}</div>
                                  {field.type === "api_panel" ? (
                                    <div style={{ background: "#EFF6FF", border: "1px dashed #3B82F6", padding: 6, borderRadius: 4, fontSize: 10, color: "#1E40AF", marginTop: 2 }}>
                                      🔌 Live API Panel ({field.api_integration_id || "Oracle"})
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-primary)", marginTop: 2 }}>
                                      {field.placeholder || "Sample Field Value"}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ padding: 12, textAlign: "center", border: "1px dashed var(--color-border)", borderRadius: 6, color: "var(--color-text-muted)", fontSize: 10 }}>
                              {lang === "ar" ? "أفلت الحقول هنا أو استخدم زر [+ Side] لإضافتها للجانب." : "Drop fields here or click [+ Side] to add to sidebar."}
                            </div>
                          )}
                        </div>


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
                      <TransportationRouteControl value={[]} onChange={() => {}} limits={field.travelLimits} />
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

      {/* ── SECTION / CARD SETTINGS & PERMISSIONS MODAL ── */}
      {sectionModalOpen && editingSectionData && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 20,
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 500, padding: 24, borderRadius: 12, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: "var(--color-primary)" }}>
                ⚙️ {lang === "ar" ? "إعدادات البوكس وصلاحيات الرؤية" : "Box Settings & Visibility Permissions"}
              </h3>
              <button
                type="button"
                onClick={() => setSectionModalOpen(false)}
                style={{ background: "transparent", border: "none", fontSize: 16, cursor: "pointer", fontWeight: 900 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Box Title */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, display: "block", marginBottom: 4 }}>
                  📌 {lang === "ar" ? "اسم / عنوان البوكس:" : "Box / Card Title:"}
                </label>
                <input
                  className="form-control"
                  style={{ fontSize: 12 }}
                  value={editingSectionData.title}
                  onChange={e => setEditingSectionData({ ...editingSectionData, title: e.target.value })}
                  placeholder={lang === "ar" ? "مثال: تفاصيل فحص المخازن وأوراكل" : "e.g. Oracle Stock Details"}
                />
              </div>

              {/* Visibility Scope Radio */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, display: "block", marginBottom: 6 }}>
                  👁️ {lang === "ar" ? "من يمكنه رؤية هذا البوكس داخل التكت؟" : "Who can see this box in the ticket?"}
                </label>
                <div style={{ display: "flex", gap: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                    <input
                      type="radio"
                      name="sec_vis_scope"
                      checked={editingSectionData.visibility_scope !== "custom"}
                      onChange={() => setEditingSectionData({ ...editingSectionData, visibility_scope: "all" })}
                    />
                    🌐 {lang === "ar" ? "مرئي للجميع (All)" : "Everyone (All)"}
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                    <input
                      type="radio"
                      name="sec_vis_scope"
                      checked={editingSectionData.visibility_scope === "custom"}
                      onChange={() => setEditingSectionData({ ...editingSectionData, visibility_scope: "custom" })}
                    />
                    🔒 {lang === "ar" ? "صلاحيات مخصصة (Custom)" : "Custom Permissions"}
                  </label>
                </div>
              </div>

              {/* If Custom: Checkboxes for Groups, Depts, Users */}
              {editingSectionData.visibility_scope === "custom" && (
                <div style={{ background: "var(--color-bg)", padding: 12, borderRadius: 8, border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 10, maxHeight: 220, overflowY: "auto" }}>
                  {/* Target Groups */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 800, display: "block", marginBottom: 4, color: "#4F46E5" }}>
                      👥 {lang === "ar" ? "مجموعات العمل المسموح لها برؤية هذا البوكس:" : "Allowed Groups:"}
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 11 }}>
                      {businessGroups.map(g => (
                        <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={(editingSectionData.visible_group_ids || []).includes(g.id)}
                            onChange={e => {
                              const curr = editingSectionData.visible_group_ids || [];
                              const updated = e.target.checked ? [...curr, g.id] : curr.filter(id => id !== g.id);
                              setEditingSectionData({ ...editingSectionData, visible_group_ids: updated });
                            }}
                          />
                          <span>{g.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Target Departments */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 800, display: "block", marginBottom: 4, color: "#059669" }}>
                      🏢 {lang === "ar" ? "الأقسام المسموح لها:" : "Allowed Departments:"}
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 11 }}>
                      {departments.map(d => (
                        <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={(editingSectionData.visible_dept_ids || []).includes(d.id)}
                            onChange={e => {
                              const curr = editingSectionData.visible_dept_ids || [];
                              const updated = e.target.checked ? [...curr, d.id] : curr.filter(id => id !== d.id);
                              setEditingSectionData({ ...editingSectionData, visible_dept_ids: updated });
                            }}
                          />
                          <span>{d.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Target Specific Users */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 800, display: "block", marginBottom: 4, color: "#D97706" }}>
                      👤 {lang === "ar" ? "أشخاص محددون:" : "Specific Users:"}
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                      {users.map(u => (
                        <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={(editingSectionData.visible_user_ids || []).includes(u.id)}
                            onChange={e => {
                              const curr = editingSectionData.visible_user_ids || [];
                              const updated = e.target.checked ? [...curr, u.id] : curr.filter(id => id !== u.id);
                              setEditingSectionData({ ...editingSectionData, visible_user_ids: updated });
                            }}
                          />
                          <span>{u.name} ({u.role})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setSectionModalOpen(false)}
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (!editingSectionData.title.trim()) {
                    alert(lang === "ar" ? "يرجى كتابة عنوان للبوكس" : "Please enter a box title");
                    return;
                  }
                  const exists = customSections.some(s => s.id === editingSectionData.id);
                  if (exists) {
                    setCustomSections(prev => prev.map(s => s.id === editingSectionData.id ? editingSectionData : s));
                  } else {
                    setCustomSections(prev => [...prev, editingSectionData]);
                    setActiveTargetSectionId(editingSectionData.id);
                  }
                  setSectionModalOpen(false);
                }}
              >
                {lang === "ar" ? "حفظ البوكس" : "Save Box"}
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
