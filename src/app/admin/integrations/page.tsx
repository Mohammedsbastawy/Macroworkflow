"use client";
import { useState, useEffect } from "react";
import { 
  fetchAllIntegrationsAction, 
  saveIntegrationAction, 
  deleteIntegrationAction,
  fetchEndpointsForIntegrationAction,
  saveEndpointAction,
  deleteEndpointAction,
  ApiEndpoint
} from "@/app/actions/integrationActions";
import { testOracleConnectionAction } from "@/app/actions/oracleInventoryActions";
import { fetchSystemUsersAction } from "@/app/actions/workflowActions";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import Link from "next/link";

interface ApiIntegration {
  id: string;
  name: string;
  provider?: string;
  auth_type?: string;
  endpoint_url: string;
  http_method?: string;
  request_body_template?: string;
  config_json?: any;
  auth_headers_json?: string;
  allowed_roles_json?: string;
  allowed_users_json?: string;
  is_active: number | boolean;
}

const ALL_ROLES = [
  { key: "admin", labelEn: "Admin - System Administrator", labelAr: "Admin - مدير النظام" },
  { key: "agent", labelEn: "Agent - Technical Support", labelAr: "Agent - موظف تقني" },
  { key: "selfservice", labelEn: "Self-Service - Regular Employee", labelAr: "Self-Service - موظف عادي" },
  { key: "inventory", labelEn: "Inventory - Stock & Warehouse", labelAr: "Inventory - مخازن" },
  { key: "supply_chain", labelEn: "Supply Chain - Supply & Logistics", labelAr: "Supply Chain - سلسلة التوريد" },
  { key: "finance", labelEn: "Finance - Financial Department", labelAr: "Finance - مالي" },
  { key: "procurement", labelEn: "Procurement - Purchasing", labelAr: "Procurement - مشتريات" },
];

export default function IntegrationsAdminPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [endpointsMap, setEndpointsMap] = useState<Record<string, ApiEndpoint[]>>({});
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Integration Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingConfig, setExistingConfig] = useState<any>({});

  // Endpoint Modal State
  const [showEndpointModal, setShowEndpointModal] = useState(false);
  const [editingEndpointId, setEditingEndpointId] = useState<string | null>(null);
  const [targetIntegrationId, setTargetIntegrationId] = useState<string>("");
  const [epName, setEpName] = useState("");
  const [epHttpMethod, setEpHttpMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("GET");
  const [epPath, setEpPath] = useState("");
  const [epResponsePath, setEpResponsePath] = useState("");
  const [epDescription, setEpDescription] = useState("");
  const [epIsActive, setEpIsActive] = useState(true);

  // Form state for Integrations
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("oracle_fusion");
  const [authType, setAuthType] = useState<"jwt_rs256" | "basic" | "bearer" | "custom" | "none">("jwt_rs256");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [httpMethod, setHttpMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("GET");
  const [requestBodyTemplate, setRequestBodyTemplate] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEndpoint, setSavingEndpoint] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Auth RS256 Fields
  const [prnUsername, setPrnUsername] = useState("");
  const [keyId, setKeyId] = useState("");
  const [privateKeyPem, setPrivateKeyPem] = useState("");
  const [tokenExpiryMinutes, setTokenExpiryMinutes] = useState(30);

  // Basic Auth Credentials
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");

  // Bearer Token
  const [bearerToken, setBearerToken] = useState("");

  // Custom Headers
  const [authHeaders, setAuthHeaders] = useState<{ key: string; value: string }[]>([
    { key: "Authorization", value: "" }
  ]);

  const loadData = async () => {
    setLoading(true);
    const [apis, users, allEndpoints] = await Promise.all([
      fetchAllIntegrationsAction(),
      fetchSystemUsersAction(),
      fetchEndpointsForIntegrationAction()
    ]);
    setIntegrations(apis);
    setAllUsers(users);

    const map: Record<string, ApiEndpoint[]> = {};
    allEndpoints.forEach((ep: any) => {
      if (!map[ep.integration_id]) map[ep.integration_id] = [];
      map[ep.integration_id].push(ep);
    });
    setEndpointsMap(map);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setExistingConfig({});
    setName("");
    setProvider("oracle_fusion");
    setAuthType("jwt_rs256");
    setEndpointUrl("");
    setHttpMethod("GET");
    setRequestBodyTemplate("");
    setSelectedRoles([]);
    setSelectedUsers([]);
    setUserSearch("");
    setIsActive(true);
    setPrnUsername("");
    setKeyId("");
    setPrivateKeyPem("");
    setTokenExpiryMinutes(30);
    setBasicUsername("");
    setBasicPassword("");
    setBearerToken("");
    setAuthHeaders([{ key: "Authorization", value: "" }]);
  };

  const resetEndpointForm = (integrationId: string) => {
    setTargetIntegrationId(integrationId);
    setEditingEndpointId(null);
    setEpName("");
    setEpHttpMethod("GET");
    setEpPath("");
    setEpResponsePath("");
    setEpDescription("");
    setEpIsActive(true);
  };

  const openAddEndpointModal = (integrationId: string) => {
    resetEndpointForm(integrationId);
    setShowEndpointModal(true);
  };

  const openEditEndpointModal = (ep: ApiEndpoint) => {
    setTargetIntegrationId(ep.integration_id);
    setEditingEndpointId(ep.id);
    setEpName(ep.name);
    setEpHttpMethod(ep.http_method);
    setEpPath(ep.path);
    setEpResponsePath(ep.response_display_path || "");
    setEpDescription(ep.description || "");
    setEpIsActive(!!ep.is_active);
    setShowEndpointModal(true);
  };

  const handleEdit = (api: ApiIntegration) => {
    setEditingId(api.id);
    setName(api.name);
    setProvider(api.provider || "oracle_fusion");
    setAuthType((api.auth_type as any) || "jwt_rs256");
    setEndpointUrl(api.endpoint_url);
    setHttpMethod((api.http_method as any) || "GET");
    setRequestBodyTemplate(api.request_body_template || "");
    setIsActive(!!api.is_active);

    try { setSelectedRoles(JSON.parse(api.allowed_roles_json || "[]")); } catch { setSelectedRoles([]); }
    try { setSelectedUsers(JSON.parse(api.allowed_users_json || "[]")); } catch { setSelectedUsers([]); }

    try {
      let cfg = api.config_json || {};
      if (typeof cfg === "string") cfg = JSON.parse(cfg);
      setExistingConfig(cfg);
      setPrnUsername(cfg.prn_username || "");
      setKeyId(cfg.key_id || "");
      setPrivateKeyPem(cfg.private_key && !cfg.private_key.startsWith("AES256GCM:") ? cfg.private_key : "");
      setTokenExpiryMinutes(cfg.token_expiry_minutes || 30);
    } catch {
      setExistingConfig({});
      setPrnUsername("");
      setKeyId("");
      setPrivateKeyPem("");
    }

    try {
      const h = JSON.parse(api.auth_headers_json || "{}");
      const authVal = h["Authorization"] || h["authorization"] || "";
      if (authVal.startsWith("Basic ")) {
        setBasicUsername(atob(authVal.replace("Basic ", "")).split(":")[0] || "");
        setBasicPassword(atob(authVal.replace("Basic ", "")).split(":")[1] || "");
      } else if (authVal.startsWith("Bearer ")) {
        setBearerToken(authVal.replace("Bearer ", ""));
      } else {
        const arr = Object.entries(h).map(([k, v]) => ({ key: k, value: String(v) }));
        if (arr.length > 0) setAuthHeaders(arr);
      }
    } catch {}

    setShowModal(true);
  };

  const toggleRole = (roleKey: string) => {
    if (selectedRoles.includes(roleKey)) {
      setSelectedRoles(selectedRoles.filter(r => r !== roleKey));
    } else {
      setSelectedRoles([...selectedRoles, roleKey]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return alert(isAr ? "يرجى كتابة اسم النظام الخارجي" : "System name is required.");
    if (!endpointUrl.trim()) return alert(isAr ? "يرجى كتابة رابط النظام الأساسي" : "Endpoint URL is required.");

    setSaving(true);
    let finalAuthHeaders: Record<string, string> = {};
    if (authType === "basic" && basicUsername) {
      finalAuthHeaders["Authorization"] = "Basic " + btoa(`${basicUsername}:${basicPassword}`);
    } else if (authType === "bearer" && bearerToken) {
      finalAuthHeaders["Authorization"] = "Bearer " + bearerToken;
    } else if (authType === "custom") {
      authHeaders.forEach(h => {
        if (h.key.trim()) finalAuthHeaders[h.key.trim()] = h.value;
      });
    }

    const configObj: any = { ...existingConfig };
    if (authType === "jwt_rs256") {
      if (prnUsername) configObj.prn_username = prnUsername;
      if (keyId) configObj.key_id = keyId;
      if (privateKeyPem) configObj.private_key = privateKeyPem;
      if (tokenExpiryMinutes) configObj.token_expiry_minutes = tokenExpiryMinutes;
    }

    configObj.base_url = endpointUrl;

    const res = await saveIntegrationAction({
      id: editingId || undefined,
      name: name.trim(),
      provider,
      auth_type: authType,
      endpoint_url: endpointUrl.trim(),
      http_method: httpMethod,
      request_body_template: requestBodyTemplate || undefined,
      config_json: configObj,
      auth_headers_json: JSON.stringify(finalAuthHeaders),
      allowed_roles_json: JSON.stringify(selectedRoles),
      allowed_users_json: JSON.stringify(selectedUsers),
      is_active: isActive ? 1 : 0
    });

    setSaving(false);
    if (res.success) {
      setShowModal(false);
      resetForm();
      loadData();
    } else {
      alert("Failed: " + res.error);
    }
  };

  const handleSaveEndpoint = async () => {
    if (!epName.trim()) return alert(isAr ? "يرجى كتابة اسم العملية/Endpoint" : "Endpoint name required.");
    if (!epPath.trim()) return alert(isAr ? "يرجى كتابة المسار (Path)" : "Endpoint path required.");

    setSavingEndpoint(true);
    const res = await saveEndpointAction({
      id: editingEndpointId || undefined,
      integration_id: targetIntegrationId,
      name: epName.trim(),
      http_method: epHttpMethod,
      path: epPath.trim(),
      response_display_path: epResponsePath.trim() || undefined,
      description: epDescription.trim() || undefined,
      is_active: epIsActive ? 1 : 0
    });
    setSavingEndpoint(false);

    if (res.success) {
      setShowEndpointModal(false);
      loadData();
    } else {
      alert("Failed to save endpoint: " + res.error);
    }
  };

  const handleTestConnection = async (integrationId: string) => {
    setTestingId(integrationId);
    const res = await testOracleConnectionAction(integrationId);
    setTestingId(null);

    if (res.success) {
      alert(isAr 
        ? `✅ نجح الاتصال والنظام جاهز!\nبيانات النظام: ${JSON.stringify((res as any).sampleItem || (res as any).data || (res as any).message || "OK")}`
        : `✅ Connection Successful!\nDetails: ${JSON.stringify((res as any).sampleItem || (res as any).data || (res as any).message || "OK")}`);
    } else {
      alert(isAr ? `❌ فشل الاتصال: ${res.error}` : `❌ Connection Failed: ${res.error}`);
    }
  };

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <div>
            <div className="sidebar-logo-text">WorkflowOS</div>
            <div className="sidebar-logo-sub">System Setup</div>
          </div>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-label">Admin</div>
          <Link href="/admin/org-chart" className="sidebar-nav-item">🏢 {isAr ? "الهيكل التنظيمي" : "Org Chart"}</Link>
          <Link href="/admin/budgets" className="sidebar-nav-item">💰 {isAr ? "الميزانيات" : "Budgets"}</Link>
          <Link href="/admin/policies" className="sidebar-nav-item">📜 {isAr ? "السياسات واللوائح" : "Policies"}</Link>
          <Link href="/admin/users" className="sidebar-nav-item">👥 {isAr ? "المستخدمين والصلاحيات" : "Users & IAM"}</Link>
          <Link href="/admin/profiles" className="sidebar-nav-item">🛡️ {isAr ? "إعدادات البروفايل" : "Profile Setup"}</Link>
          <Link href="/admin/reports" className="sidebar-nav-item">📊 {isAr ? "التقارير واتفاقيات الخدمة" : "Reports & SLA"}</Link>
          <Link href="/admin/integrations" className="sidebar-nav-item active">🔌 API Integrations</Link>
          <Link href="/admin/settings" className="sidebar-nav-item">⚙️ {isAr ? "الإعدادات" : "Settings"}</Link>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="page-title">🔌 API Integrations Hub</h1>
            <p className="page-subtitle">
              {isAr ? "إدارة الأنظمة الخارجية وإضافة مسارات العمليات (Endpoints) بسهولة بدون كود" : "Manage external API integrations & add operation endpoints seamlessly without code."}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            + {isAr ? "إضافة نظام خارجي (System)" : "Add External System"}
          </button>
        </header>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
            {isAr ? "جاري التحميل..." : "Loading integrations..."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {integrations.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
                {isAr ? "لا يوجد أي نظام مرتبط حتى الآن. اضغط \"+ إضافة نظام خارجي\" للبدء." : "No external integrations configured yet. Click \"+ Add External System\" to begin."}
              </div>
            ) : (
              integrations.map((api) => {
                let roles: string[] = [];
                try { roles = JSON.parse(api.allowed_roles_json || "[]"); } catch {}
                const authTypeDisplay = api.auth_type || "jwt_rs256";
                const endpoints = endpointsMap[api.id] || [];

                return (
                  <div key={api.id} className="card" style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflow: "hidden" }}>
                    
                    {/* Header Row */}
                    <div style={{ padding: "16px 20px", background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <span style={{ fontSize: 16, fontWeight: 900, color: "var(--color-primary)" }}>🔌 {api.name}</span>
                          <span style={{ background: "rgba(79,70,229,0.1)", color: "var(--color-primary)", border: "1px solid var(--color-primary)", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>
                            🔑 {authTypeDisplay.toUpperCase()}
                          </span>
                          <span className={`badge ${api.is_active ? "solved" : "rejected"}`}>
                            {api.is_active ? (isAr ? "✅ نشط" : "✅ Active") : (isAr ? "❌ معطل" : "❌ Disabled")}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                          🌐 {api.endpoint_url}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => openAddEndpointModal(api.id)}
                          style={{ background: "#10B981", color: "#FFF", fontWeight: 800 }}
                        >
                          ➕ {isAr ? "إضافة Endpoint" : "Add Endpoint"}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleTestConnection(api.id)}
                          disabled={testingId === api.id}
                          style={{ color: "var(--color-primary)", fontWeight: 700 }}
                        >
                          {testingId === api.id ? "⏳ ..." : "🧪 Test"}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(api)}>✏️ {isAr ? "تعديل" : "Edit"}</button>
                        <button className="btn btn-sm" onClick={async () => {
                          if (confirm(isAr ? "هل تريد حذف هذا النظام بكافة العمليات التابعة له؟" : "Are you sure you want to delete this system and all its endpoints?")) {
                            await deleteIntegrationAction(api.id);
                            loadData();
                          }
                        }} style={{ color: "#EF4444" }}>🗑️</button>
                      </div>
                    </div>

                    {/* Endpoints Section */}
                    <div style={{ padding: "14px 20px", background: "var(--color-surface)" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-text-muted)", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>📍 {isAr ? "العمليات والـ Endpoints المتاحة لهذا النظام:" : "Endpoints configured for this system:"} ({endpoints.length})</span>
                      </div>

                      {endpoints.length === 0 ? (
                        <div style={{ padding: "12px 14px", background: "var(--color-bg)", borderRadius: 6, border: "1px dashed var(--color-border)", fontSize: 11, color: "var(--color-text-muted)", textAlign: "center" }}>
                          💡 {isAr ? "لم تقم بإضافة مسارات محددة (Endpoints) حتى الآن. اضغط \"➕ إضافة Endpoint\" للبدء." : "No specific endpoints added yet. Click \"+ Add Endpoint\" to add operations like item search, stocks, etc."}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {endpoints.map((ep) => (
                            <div key={ep.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--color-bg)", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 4,
                                  background: ep.http_method === "GET" ? "#DBEAFE" : ep.http_method === "POST" ? "#DCFCE7" : "#FEF3C7",
                                  color: ep.http_method === "GET" ? "#1E40AF" : ep.http_method === "POST" ? "#166534" : "#92400E"
                                }}>
                                  {ep.http_method}
                                </span>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-primary)" }}>{ep.name}</div>
                                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                                    {ep.path}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button className="btn btn-ghost btn-xs" onClick={() => openEditEndpointModal(ep)}>✏️</button>
                                <button className="btn btn-ghost btn-xs" style={{ color: "#EF4444" }} onClick={async () => {
                                  if (confirm(isAr ? "هل تريد حذف هذه العملية؟" : "Delete this endpoint?")) {
                                    await deleteEndpointAction(ep.id);
                                    loadData();
                                  }
                                }}>🗑️</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Integration System Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 640, maxWidth: "95vw", maxHeight: "92vh", overflowY: "auto" }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="card-title">
                {editingId 
                  ? (isAr ? "تعديل النظام الخارجي" : "Edit External Integration") 
                  : (isAr ? "إضافة نظام خارجي جديد" : "Add New External Integration")}
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* System Name */}
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
                  {isAr ? "اسم النظام *" : "System Name *"}
                </label>
                <input
                  className="form-control"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={isAr ? "مثال: Oracle Fusion Cloud SCM" : "e.g. Oracle Fusion Cloud SCM"}
                />
              </div>

              {/* Provider */}
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
                  🏢 {isAr ? "مزود الخدمة (Provider) *" : "Provider *"}
                </label>
                <select
                  className="form-control"
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                  style={{ fontSize: 13, fontWeight: 700 }}
                >
                  <option value="oracle_fusion">Oracle Fusion Cloud SCM</option>
                  <option value="sap">SAP ERP System</option>
                  <option value="custom">Generic REST Service</option>
                </select>
              </div>

              {/* Endpoint Base URL */}
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
                  {isAr ? "رابط النظام الأساسي (Base URL) *" : "Base URL / Endpoint URL *"}
                </label>
                <input
                  className="form-control"
                  value={endpointUrl}
                  onChange={e => setEndpointUrl(e.target.value)}
                  placeholder="https://fa-epmo-test-saasfaprod1.fa.ocs.oraclecloud.com"
                  style={{ fontFamily: "monospace", fontSize: 12 }}
                />
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, padding: "6px 10px", background: "var(--color-bg)", borderRadius: 6, border: "1px dashed var(--color-border)" }}>
                  💡 {isAr ? "اكتب الرابط الرئيسي فقط. المسارات المحددة مثل /fscmRestApi/... تضاف في قسم الـ Endpoints." : "Enter your main Server Instance Base URL."}
                </div>
              </div>

              {/* Authentication Strategy Selector */}
              <div>
                <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
                  🔐 {isAr ? "استراتيجية المصادقة والأمان (Auth Strategy)" : "Authentication Strategy"}
                </label>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  {[
                    { key: "jwt_rs256", labelEn: "JWT RS256 (Oracle Fusion)", labelAr: "JWT RS256 (Oracle Fusion المفتاح الخاص)" },
                    { key: "basic", labelEn: "Basic Auth (User & Pass)", labelAr: "اسم المستخدم وكلمة السر (Basic Auth)" },
                    { key: "bearer", labelEn: "Bearer Token / API Key", labelAr: "رمز الوصول (Bearer Token)" },
                    { key: "custom", labelEn: "Custom Headers", labelAr: "مفاتيح مخصصة (Custom Headers)" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setAuthType(item.key as any)}
                      style={{
                        padding: "8px 12px",
                        fontSize: 12,
                        fontWeight: authType === item.key ? 800 : 500,
                        borderRadius: 6,
                        border: `2px solid ${authType === item.key ? "var(--color-primary)" : "var(--color-border)"}`,
                        background: authType === item.key ? "rgba(79,70,229,0.08)" : "var(--color-bg)",
                        color: authType === item.key ? "var(--color-primary)" : "var(--color-text-primary)",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      {isAr ? item.labelAr : item.labelEn}
                    </button>
                  ))}
                </div>

                {/* RS256 */}
                {authType === "jwt_rs256" && (
                  <div style={{ padding: 14, background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 11, color: "var(--color-primary)", fontWeight: 700 }}>
                      🛡️ Oracle Fusion Cloud RS256 Private Key Signed JWT
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 700 }}>
                          Oracle Username (`prn`) *
                        </label>
                        <input className="form-control" value={prnUsername} onChange={e => setPrnUsername(e.target.value)} placeholder="e.g. mohammed.bastawy@macro-egy.com" />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 700 }}>
                          Key ID (`kid`) *
                        </label>
                        <input className="form-control" value={keyId} onChange={e => setKeyId(e.target.value)} placeholder="e.g. trustservice" />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 700 }}>
                        RSA Private Key (PEM format) *
                      </label>
                      <textarea
                        className="form-control"
                        rows={4}
                        value={privateKeyPem}
                        onChange={e => setPrivateKeyPem(e.target.value)}
                        placeholder={existingConfig.private_key ? "🔒 Saved securely." : "-----BEGIN RSA PRIVATE KEY-----..."}
                        style={{ fontFamily: "monospace", fontSize: 11 }}
                      />
                    </div>
                  </div>
                )}

                {authType === "basic" && (
                  <div style={{ padding: 14, background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 700 }}>Username</label>
                      <input className="form-control" value={basicUsername} onChange={e => setBasicUsername(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 700 }}>Password</label>
                      <input type="password" className="form-control" value={basicPassword} onChange={e => setBasicPassword(e.target.value)} />
                    </div>
                  </div>
                )}

                {authType === "bearer" && (
                  <div style={{ padding: 14, background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                    <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 700 }}>Bearer Token</label>
                    <input className="form-control" value={bearerToken} onChange={e => setBearerToken(e.target.value)} style={{ fontFamily: "monospace", fontSize: 12 }} />
                  </div>
                )}
              </div>

              {/* Roles */}
              <div>
                <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
                  👥 {isAr ? "الأدوار المسموح لها باستخدامه" : "Authorized Roles"}
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ALL_ROLES.map(role => (
                    <label key={role.key} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                      borderRadius: 8, border: `2px solid ${selectedRoles.includes(role.key) ? "var(--color-primary)" : "var(--color-border)"}`,
                      background: selectedRoles.includes(role.key) ? "rgba(79,70,229,0.08)" : "var(--color-bg)",
                      cursor: "pointer", fontSize: 12, fontWeight: selectedRoles.includes(role.key) ? 700 : 500,
                      color: selectedRoles.includes(role.key) ? "var(--color-primary)" : "var(--color-text-primary)"
                    }}>
                      <input type="checkbox" style={{ display: "none" }} checked={selectedRoles.includes(role.key)} onChange={() => toggleRole(role.key)} />
                      {selectedRoles.includes(role.key) ? "✅" : "☐"} {isAr ? role.labelAr : role.labelEn}
                    </label>
                  ))}
                </div>
              </div>

              {/* Active */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "10px 14px", background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: 16, height: 16 }} />
                {isActive ? (isAr ? "✅ النظام نشط ومتاح" : "✅ Integration active") : (isAr ? "❌ النظام معطل" : "❌ Integration disabled")}
              </label>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => { setShowModal(false); resetForm(); }}>{isAr ? "إلغاء" : "Cancel"}</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? (isAr ? "⏳ جاري الحفظ..." : "⏳ Saving...") : (isAr ? "💾 حفظ" : "💾 Save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Endpoint Modal */}
      {showEndpointModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 560, maxWidth: "95vw" }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="card-title">
                ➕ {editingEndpointId 
                  ? (isAr ? "تعديل الـ Endpoint" : "Edit Endpoint")
                  : (isAr ? "إضافة Endpoint جديد" : "Add New Endpoint")}
              </div>
              <button onClick={() => setShowEndpointModal(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
                  {isAr ? "اسم العملية (Endpoint Name) *" : "Endpoint Name *"}
                </label>
                <input
                  className="form-control"
                  value={epName}
                  onChange={e => setEpName(e.target.value)}
                  placeholder={isAr ? "مثال: البحث عن الأصناف في المخازن" : "e.g. Search Warehouse Items"}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
                    Method *
                  </label>
                  <select
                    className="form-control"
                    value={epHttpMethod}
                    onChange={e => setEpHttpMethod(e.target.value as any)}
                    style={{ fontSize: 12, fontWeight: 800 }}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
                    {isAr ? "المسار التكميلي (Path / Route) *" : "Endpoint Path *"}
                  </label>
                  <input
                    className="form-control"
                    value={epPath}
                    onChange={e => setEpPath(e.target.value)}
                    placeholder="/fscmRestApi/resources/11.13.18.05/itemsV2?q=ItemNumber LIKE '%{query}%'"
                    style={{ fontFamily: "monospace", fontSize: 11 }}
                  />
                </div>
              </div>

              <div style={{ fontSize: 11, color: "var(--color-text-muted)", padding: "6px 10px", background: "var(--color-bg)", borderRadius: 6, border: "1px dashed var(--color-border)" }}>
                💡 {isAr ? "ضع {query} في مكان المتغير الذي سيتم البحث به تلقائياً في الاستمارة." : "Use {query} where the input field value will be dynamically injected."}
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                  {isAr ? "مسار الرد (Response Display Path - اختياري)" : "Response Path (Optional)"}
                </label>
                <input
                  className="form-control"
                  value={epResponsePath}
                  onChange={e => setEpResponsePath(e.target.value)}
                  placeholder="items"
                  style={{ fontSize: 12 }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
                <button className="btn btn-ghost" onClick={() => setShowEndpointModal(false)}>{isAr ? "إلغاء" : "Cancel"}</button>
                <button className="btn btn-primary" onClick={handleSaveEndpoint} disabled={savingEndpoint}>
                  {savingEndpoint ? (isAr ? "⏳ جاري الحفظ..." : "⏳ Saving...") : (isAr ? "💾 حفظ الـ Endpoint" : "💾 Save Endpoint")}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
