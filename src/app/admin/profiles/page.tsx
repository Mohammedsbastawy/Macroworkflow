"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SYSTEM_USERS, SystemUser, DEFAULT_ROLE_PERMISSIONS } from "@/lib/engine/iamStore";
import { fetchRolePermissionsAction, saveRolePermissionsAction } from "@/app/actions/workflowActions";
import { AuthGuard } from "@/components/auth/AuthGuard";

export interface ProfilePermissions {
  id: string;
  code: "USER" | "APPROVAL" | "ADMIN";
  roleKey: "standard" | "approver" | "admin";
  name: string;
  badgeColor: string;
  description: string;
  modules: {
    dashboard: boolean;
    catalog: boolean;
    newRequest: boolean;
    myRequests: boolean;
    pendingApprovals: boolean;
    workflowBuilder: boolean;
    usersIam: boolean;
    profileSetup: boolean;
    reportsSla: boolean;
    settings: boolean;
  };
  actions: {
    cancelRequest: boolean;
    delegateApproval: boolean;
    requestInfoRfi: boolean;
    exportReports: boolean;
    overrideOlaTimer: boolean;
  };
}

const DEFAULT_PROFILES_META: Omit<ProfilePermissions, "modules" | "actions">[] = [
  {
    id: "prof-user",
    code: "USER",
    roleKey: "standard",
    name: "Standard Employee (USER)",
    badgeColor: "draft",
    description: "Default profile for general staff. Can initiate requests and track own submissions.",
  },
  {
    id: "prof-approval",
    code: "APPROVAL",
    roleKey: "approver",
    name: "Approver & Manager (APPROVAL)",
    badgeColor: "info",
    description: "Management profile for department heads and committee approvers.",
  },
  {
    id: "prof-admin",
    code: "ADMIN",
    roleKey: "admin",
    name: "System Administrator (ADMIN)",
    badgeColor: "urgent",
    description: "Full control over all system modules, IAM settings, visual workflows, and system rules.",
  },
];

export default function ProfileSetupPage() {
  const [selectedProfileId, setSelectedProfileId] = useState<string>("prof-user");
  const [permissionsMap, setPermissionsMap] = useState<Record<string, any>>({});
  const [currentUser, setCurrentUser] = useState<SystemUser>(SYSTEM_USERS[0]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);

    // Get current simulated user
    const savedId = localStorage.getItem("simulated_user_id");
    if (savedId) {
      const found = SYSTEM_USERS.find((u) => u.id === savedId);
      if (found) setCurrentUser(found);
    } else {
      setCurrentUser(SYSTEM_USERS[0]);
    }

    try {
      const res = await fetchRolePermissionsAction();
      setPermissionsMap(res || DEFAULT_ROLE_PERMISSIONS);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUserSwitch = () => loadData();
    window.addEventListener("user-simulated-switch", handleUserSwitch);
    return () => window.removeEventListener("user-simulated-switch", handleUserSwitch);
  }, []);

  // Check if active user's role is granted access to 'profileSetup' module
  const currentUserRoleConfig = permissionsMap[currentUser.role] || DEFAULT_ROLE_PERMISSIONS[currentUser.role] || {};
  const isAccessAllowed = currentUserRoleConfig.modules?.profileSetup === true;

  // Access Denied Guard if current user does not have permission
  if (!loading && !isAccessAllowed) {
    return (
      <div className="card" style={{ padding: "60px 20px", textAlign: "center", maxWidth: 540, margin: "40px auto" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-danger)", marginBottom: 8 }}>
          403 Forbidden — Access Denied
        </h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
          Your active account (<strong>{currentUser.name}</strong> · {currentUser.role.toUpperCase()}) does not have permission to access the <strong>Profile Setup & Permissions</strong> module.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Link href="/">
            <button className="btn btn-primary">Return to Dashboard</button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedMeta = DEFAULT_PROFILES_META.find((p) => p.id === selectedProfileId) || DEFAULT_PROFILES_META[0];
  const activeRoleConfig = permissionsMap[selectedMeta.roleKey] || DEFAULT_ROLE_PERMISSIONS[selectedMeta.roleKey] || {};

  const handleToggleModule = (moduleKey: string) => {
    const current = permissionsMap[selectedMeta.roleKey] || activeRoleConfig;
    const updated = {
      ...current,
      modules: {
        ...current.modules,
        [moduleKey]: !current.modules[moduleKey],
      },
    };
    setPermissionsMap({
      ...permissionsMap,
      [selectedMeta.roleKey]: updated,
    });
  };

  const handleToggleAction = (actionKey: string) => {
    const current = permissionsMap[selectedMeta.roleKey] || activeRoleConfig;
    const updated = {
      ...current,
      actions: {
        ...current.actions,
        [actionKey]: !current.actions[actionKey],
      },
    };
    setPermissionsMap({
      ...permissionsMap,
      [selectedMeta.roleKey]: updated,
    });
  };

  const handleSetTicketScope = (scope: "own" | "group" | "department" | "all") => {
    const current = permissionsMap[selectedMeta.roleKey] || activeRoleConfig;
    const updated = {
      ...current,
      ticketScope: scope,
    };
    setPermissionsMap({
      ...permissionsMap,
      [selectedMeta.roleKey]: updated,
    });
  };

  const handleSavePermissions = async () => {
    const currentConfig = permissionsMap[selectedMeta.roleKey] || activeRoleConfig;
    try {
      await saveRolePermissionsAction(selectedMeta.roleKey, currentConfig);
      window.dispatchEvent(new Event("profile-permissions-updated"));
      setSaveStatus(`Permissions for profile "${selectedMeta.name}" saved & applied across system!`);
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err) {
      alert("Error saving profile permissions: " + err);
    }
  };

  const getDynamicUserCount = (roleKey: string) => {
    return SYSTEM_USERS.filter((u) => u.role === roleKey).length;
  };

  return (
    <AuthGuard requiredModule="profileSetup" allowRoles={['admin']}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🛡️ Profile Setup & Role Permissions</h1>
          <p className="page-subtitle">Configure real, functional access rights for USER, APPROVAL, and ADMIN profiles</p>
        </div>
        <button className="btn btn-primary" onClick={handleSavePermissions}>
          💾 Save Profile Permissions
        </button>
      </div>

      {saveStatus && (
        <div style={{ padding: "10px 16px", background: "#D1FAE5", border: "1px solid #10B981", color: "#065F46", borderRadius: "var(--radius-md)", marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          ✅ {saveStatus}
        </div>
      )}

      {/* Profile Switcher Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {DEFAULT_PROFILES_META.map((p) => {
          const isSelected = p.id === selectedProfileId;
          const dynamicCount = getDynamicUserCount(p.roleKey);
          return (
            <div
              key={p.id}
              className="card"
              onClick={() => setSelectedProfileId(p.id)}
              style={{
                cursor: "pointer",
                border: `2px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                background: isSelected ? "var(--color-primary-light)" : "var(--color-surface)",
                transition: "all 0.15s",
              }}
            >
              <div className="card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "var(--color-text-primary)" }}>{p.name}</div>
                  <span className={`badge ${p.badgeColor}`}>{p.code}</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: 12 }}>
                  {p.description}
                </p>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600 }}>
                  👥 {dynamicCount} Active User{dynamicCount === 1 ? "" : "s"} Assigned
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Profile Permissions Matrix */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading role permissions from DB...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Portal View Mode Selector Card */}
          <div className="card" style={{ borderLeft: "4px solid var(--color-primary)" }}>
            <div className="card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--color-text-primary)" }}>
                  🖥️ Portal Layout Mode for {selectedMeta.code} Profile
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  Select whether users with this profile get a simplified self-service portal or the full enterprise dashboard.
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    background: selectedMeta.roleKey === "standard" ? "var(--color-primary-light)" : "var(--color-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="radio"
                    name="portalLayout"
                    checked={selectedMeta.roleKey === "standard"}
                    readOnly
                  />
                  Simplified Self-Service Portal (Categories & My Requests Only)
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    background: selectedMeta.roleKey !== "standard" ? "var(--color-primary-light)" : "var(--color-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="radio"
                    name="portalLayout"
                    checked={selectedMeta.roleKey !== "standard"}
                    readOnly
                  />
                  Full Enterprise Workspace (Dashboard, Analytics & Full Navigation)
                </label>
              </div>
            </div>
          </div>

          {/* 🎯 Ticket Access Scope Selector Card */}
          <div className="card" style={{ borderLeft: "4px solid #10B981" }}>
            <div className="card-header">
              <div>
                <div className="card-title">🎯 Ticket Scope & Ownership Access (نطاق الوصول للطلبات والتذاكر)</div>
                <div className="card-subtitle">حدد مستوى وصول البروفايل ({selectedMeta.code}) لرؤية والتفاعل مع التذاكر والطلبات</div>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { scope: "own", label: "👤 Own Tickets Only", desc: "تذكرتي الشخصية فقط التي قمت بإرسالها" },
                  { scope: "group", label: "👥 Business Group Tickets", desc: "تذاكر الفريق/المجموعة التابع لها الموظف" },
                  { scope: "department", label: "🏢 Department Tickets", desc: "جميع تذاكر القسم والإدارة بالكامل" },
                  { scope: "all", label: "🌐 Global All Tickets", desc: "جميع تذاكر النظام بدون أي قيود (Admin)" },
                ].map((s) => {
                  const currentScope = activeRoleConfig.ticketScope || (selectedMeta.roleKey === "admin" ? "all" : selectedMeta.roleKey === "approver" ? "group" : "own");
                  const isChecked = currentScope === s.scope;
                  return (
                    <div
                      key={s.scope}
                      onClick={() => handleSetTicketScope(s.scope as any)}
                      style={{
                        padding: 12,
                        borderRadius: "var(--radius-md)",
                        border: `2px solid ${isChecked ? "#10B981" : "var(--color-border)"}`,
                        background: isChecked ? "#D1FAE5" : "var(--color-bg)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 13, color: isChecked ? "#065F46" : "var(--color-text-primary)", marginBottom: 4 }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                        {s.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Module Access Rights */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">📱 Navigation & Module Access</div>
                  <div className="card-subtitle">Control which pages are visible in the sidebar for {selectedMeta.code}</div>
                </div>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { key: "dashboard", label: "Dashboard (Home)", desc: "View KPI summary and greeting banner" },
                  { key: "catalog", label: "Service Catalog", desc: "View authorized request templates" },
                  { key: "newRequest", label: "New Request Form", desc: "Initiate new workflow submissions" },
                  { key: "myRequests", label: "My Requests", desc: "Track personal submitted requests" },
                  { key: "pendingApprovals", label: "Pending Approvals Panel", desc: "Review & approve requests assigned to user" },
                  { key: "workflowBuilder", label: "Workflow Visual Builder", desc: "n8n-style visual node canvas" },
                  { key: "usersIam", label: "Users & IAM Directory", desc: "Manage accounts, departments, and groups" },
                  { key: "profileSetup", label: "Profile Setup & Rules", desc: "Configure role permissions matrix" },
                  { key: "reportsSla", label: "Reports & SLA Analytics", desc: "View performance charts and breaches" },
                  { key: "settings", label: "System Settings", desc: "Configure SSO, APIs, and system defaults" },
                ].map((m) => (
                  <label
                    key={m.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      background: "var(--color-bg)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{m.label}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{m.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(activeRoleConfig.modules?.[m.key as keyof typeof activeRoleConfig.modules])}
                      onChange={() => handleToggleModule(m.key)}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Operational Action Permissions */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">⚡ Operational Action Rights</div>
                  <div className="card-subtitle">Control allowed workflow actions for {selectedMeta.code}</div>
                </div>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { key: "approveTicket", label: "✓ Approve Ticket Action", desc: "Allows profile to approve ITSM tickets directly" },
                  { key: "rejectTicket", label: "✕ Reject Ticket Action", desc: "Allows profile to reject ITSM tickets" },
                  { key: "reassignTicket", label: "🔄 Reassign Ticket", desc: "Allows profile to reassign tickets to another group" },
                  { key: "addInternalNote", label: "🔒 Add Internal Notes", desc: "Allows posting notes hidden from standard users" },
                  { key: "cancelRequest", label: "Cancel Own Request", desc: "Requester can cancel a pending submission" },
                  { key: "delegateApproval", label: "Delegate Approval Step", desc: "Re-assign an approval task to another colleague" },
                  { key: "requestInfoRfi", label: "Send Request For Information (RFI)", desc: "Pause OLA and ask requester for clarification" },
                  { key: "exportReports", label: "Export System Data", desc: "Download PDF/Excel reports of requests" },
                  { key: "overrideOlaTimer", label: "Override OLA Timers", desc: "Manually adjust or reset OLA deadlines" },
                ].map((a) => (
                  <label
                    key={a.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      background: "var(--color-bg)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{a.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(activeRoleConfig.actions?.[a.key as keyof typeof activeRoleConfig.actions])}
                      onChange={() => handleToggleAction(a.key)}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
