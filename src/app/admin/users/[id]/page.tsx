"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import {
  fetchSystemUsersAction,
  saveSystemUserAction,
  fetchOrgHierarchyAction,
  fetchBusinessGroupsAction,
} from "@/app/actions/workflowActions";
import { SystemUser, Department, BusinessGroup } from "@/lib/engine/iamStore";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function DedicatedUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  const router = useRouter();
  const { lang } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [allUsers, setAllUsers] = useState<SystemUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([]);

  const [activeTab, setActiveTab] = useState<"profile" | "role" | "delegation" | "reports" | "security">("profile");

  // User Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [directManagerId, setDirectManagerId] = useState("");
  const [unit, setUnit] = useState("");
  const [role, setRole] = useState<string>("selfservice");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["selfservice"]);
  const [isActive, setIsActive] = useState(true);
  const [avatarInitials, setAvatarInitials] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [canAssignGroupTickets, setCanAssignGroupTickets] = useState(false);

  // Security / Login States
  const [securityUsername, setSecurityUsername] = useState("");
  const [securityPassword, setSecurityPassword] = useState("");
  const [authType, setAuthType] = useState<string>("password");
  const [hasPassword, setHasPassword] = useState(false);

  // Delegation States
  const [delegationEnabled, setDelegationEnabled] = useState(false);
  const [delegatedUserId, setDelegatedUserId] = useState("");
  const [delegationStartDate, setDelegationStartDate] = useState("");
  const [delegationEndDate, setDelegationEndDate] = useState("");
  const [delegationNotes, setDelegationNotes] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchSystemUsersAction(),
      fetchOrgHierarchyAction(),
      fetchBusinessGroupsAction(),
    ]).then(([usersRes, deptsRes, groupsRes]) => {
      const uList = usersRes || [];
      setAllUsers(uList);
      setDepartments(deptsRes || []);
      setBusinessGroups(groupsRes || []);

      const currentUser = uList.find((u: any) => u.id === userId);
      if (currentUser) {
        setName(currentUser.name || "");
        setEmail(currentUser.email || "");
        setPhone((currentUser as any).phone || "");
        setJobTitle(currentUser.job_title || "");
        setDepartmentId(currentUser.department_id || "");
        setDirectManagerId(currentUser.direct_manager_id || "");
        setUnit(currentUser.unit || "");
        setRole(currentUser.role || "selfservice");
        setSelectedRoles(currentUser.roles || [currentUser.role || "selfservice"]);
        setIsActive(currentUser.is_active !== false);
        setAvatarInitials(currentUser.avatar_initials || (currentUser.name ? currentUser.name.substring(0, 2).toUpperCase() : "US"));
        setSelectedGroupIds(currentUser.group_ids || (currentUser as any).group_ids_json || []);

        // Delegation
        setDelegationEnabled(Boolean((currentUser as any).delegation_enabled));
        setDelegatedUserId((currentUser as any).delegated_user_id || "");
        setDelegationStartDate((currentUser as any).delegation_start_date || "");
        setDelegationEndDate((currentUser as any).delegation_end_date || "");
        setDelegationNotes((currentUser as any).delegation_notes || "");
        setCanAssignGroupTickets(Boolean(currentUser.can_assign_group_tickets));

        // Security
        setSecurityUsername((currentUser as any).username || "");
        setAuthType((currentUser as any).auth_type || "password");
        setHasPassword(Boolean((currentUser as any).password_hash));
        setSecurityPassword("");
      }
      setLoading(false);
    });
  }, [userId]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name || !email) {
      alert(lang === "ar" ? "يرجى إدخال اسم المستخدم والبريد الإلكتروني." : "Please enter user name and email.");
      return;
    }

    setSaving(true);
    setSaveMsg(null);

    try {
      await saveSystemUserAction({
        id: userId,
        name,
        email,
        phone,
        department_id: departmentId,
        group_ids: selectedGroupIds,
        role: role as any,
        roles: selectedRoles as any,
        avatar_initials: avatarInitials || name.substring(0, 2).toUpperCase(),
        job_title: jobTitle,
        direct_manager_id: directManagerId,
        unit,
        is_active: isActive,
        delegation_enabled: delegationEnabled,
        delegated_user_id: delegatedUserId,
        delegation_start_date: delegationStartDate,
        delegation_end_date: delegationEndDate,
        delegation_notes: delegationNotes,
        can_assign_group_tickets: canAssignGroupTickets ? 1 : 0,
        username: securityUsername,
        password: securityPassword || undefined,
        auth_type: authType as any,
      });

      setSaveMsg(lang === "ar" ? "✅ تم حفظ وتحديث بيانات المستخدم بنجاح في قاعدة البيانات!" : "✅ User profile updated successfully!");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err: any) {
      alert(lang === "ar" ? "حدث خطأ أثناء الحفظ: " + (err?.message || err) : "Error saving profile: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]
    );
  };

  const toggleRole = (roleVal: string) => {
    setSelectedRoles(prev => {
      const nextRoles = prev.includes(roleVal)
        ? prev.filter(r => r !== roleVal)
        : [...prev, roleVal];
      
      const primaryRole = nextRoles.includes("admin")
        ? "admin"
        : nextRoles.includes("agent")
          ? "agent"
          : "selfservice";
      setRole(primaryRole);
      
      return nextRoles;
    });
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", direction: lang === "ar" ? "rtl" : "ltr" }}>
        {lang === "ar" ? "⏳ جاري تحميل ملف وبيانات المستخدم..." : "⏳ Loading user profile..."}
      </div>
    );
  }

  const directReports = allUsers.filter(u => u.direct_manager_id === userId && u.id !== userId);
  const currentDept = departments.find(d => d.id === departmentId);
  const currentManager = allUsers.find(u => u.id === directManagerId && u.id !== userId);

  return (
    <AuthGuard requiredModule="usersIam" allowRoles={["admin"]}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, direction: lang === "ar" ? "rtl" : "ltr", textAlign: lang === "ar" ? "right" : "left" }}>
        
        {/* TOP BAR / BREADCRUMB */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/admin/users">
              <button className="btn btn-outline btn-sm">
                {lang === "ar" ? "← العودة إلى دليل المستخدمين" : "← Back to Users Directory"}
              </button>
            </Link>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>
                {lang === "ar" ? "👤 ملف وإعدادات المستخدم" : "👤 User Profile & Settings"}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>ID: {userId}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={() => handleSave()}
              disabled={saving}
            >
              {saving 
                ? (lang === "ar" ? "⏳ جاري الحفظ..." : "⏳ Saving...") 
                : (lang === "ar" ? "💾 حفظ التغييرات" : "💾 Save Changes")}
            </button>
          </div>
        </div>

        {saveMsg && (
          <div style={{ background: "#D1FAE5", border: "1px solid #10B981", color: "#065F46", padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
            {saveMsg}
          </div>
        )}

        {/* USER PROFILE HEADER CARD */}
        <div className="card" style={{ padding: 20, display: "flex", gap: 20, alignItems: "center", border: "1px solid var(--color-border)", borderRadius: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--color-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800 }}>
            {avatarInitials}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{name || (lang === "ar" ? "مستخدم جديد" : "New User")}</h2>
               <span className={`badge ${role === "admin" ? "urgent" : role === "selfservice" ? "draft" : role === "agent" ? "info" : "draft"}`}>
                 {role.toUpperCase()}
               </span>
              <span className={`badge ${isActive ? "success" : "urgent"}`}>
                {isActive ? (lang === "ar" ? "نشط ✓" : "Active ✓") : (lang === "ar" ? "معطل ✕" : "Inactive ✕")}
              </span>
            </div>

            <div style={{ display: "flex", gap: 20, marginTop: 8, fontSize: 12, color: "var(--color-text-secondary)" }}>
              <div>📧 {email}</div>
              <div>🏢 {lang === "ar" ? "القطاع:" : "Department:"} <strong>{currentDept?.name || (lang === "ar" ? "غير محدد" : "N/A")}</strong></div>
              <div>💼 {lang === "ar" ? "المسمى:" : "Title:"} <strong>{jobTitle || (lang === "ar" ? "غير محدد" : "N/A")}</strong></div>
              <div>👤 {lang === "ar" ? "المدير:" : "Manager:"} <strong>{currentManager ? currentManager.name : (lang === "ar" ? "لا يوجد (قيادي)" : "None (Lead)")}</strong></div>
            </div>
          </div>

          {/* Quick Active Toggle */}
          <div style={{ borderRight: lang === "ar" ? "1px solid var(--color-border)" : "none", borderLeft: lang === "ar" ? "none" : "1px solid var(--color-border)", paddingRight: lang === "ar" ? 20 : 0, paddingLeft: lang === "ar" ? 0 : 20, display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)" }}>
              {lang === "ar" ? "حالة الحساب" : "Account Status"}
            </label>
            <button
              className={`btn btn-sm ${isActive ? "btn-outline" : "btn-primary"}`}
              style={{ color: isActive ? "var(--color-danger)" : "#fff", fontSize: 11 }}
              onClick={() => setIsActive(!isActive)}
            >
              {isActive ? (lang === "ar" ? "تعطيل الحساب 🚫" : "Deactivate Account 🚫") : (lang === "ar" ? "تفعيل الحساب ✅" : "Activate Account ✅")}
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
          <button
            className={`btn btn-sm ${activeTab === "profile" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("profile")}
          >
            👤 {lang === "ar" ? "البيانات الأساسية والوظيفية" : "Profile & Position"}
          </button>
          <button
            className={`btn btn-sm ${activeTab === "role" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("role")}
          >
            🔑 {lang === "ar" ? "الصلاحيات والأدوار" : "Role & Permissions"}
          </button>
          <button
            className={`btn btn-sm ${activeTab === "delegation" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("delegation")}
          >
            ✈️ {lang === "ar" ? "التفويض والإجازات" : "Delegation & Leave"} {delegationEnabled && "• (Active)"}
          </button>
          <button
            className={`btn btn-sm ${activeTab === "reports" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("reports")}
          >
            👥 {lang === "ar" ? `المرؤوسون التابعون (${directReports.length})` : `Direct Reports (${directReports.length})`}
          </button>
          <button
            className={`btn btn-sm ${activeTab === "security" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("security")}
          >
            🔐 {lang === "ar" ? "تسجيل الدخول والأمان" : "Login & Security"}
          </button>
        </div>

        {/* TAB 1: BASIC PROFILE */}
        {activeTab === "profile" && (
          <div className="card" style={{ padding: 24, border: "1px solid var(--color-border)", borderRadius: 12 }}>
            <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 800 }}>
                  {lang === "ar" ? "اسم المستخدم الكامل *" : "Full Name *"}
                </label>
                <input
                  className="form-control"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (!avatarInitials) setAvatarInitials(e.target.value.substring(0, 2).toUpperCase());
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 800 }}>
                  {lang === "ar" ? "البريد الإلكتروني الرسمي *" : "Email Address *"}
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === "ar" ? "رقم الهاتف / التليفون" : "Phone Number"}
                </label>
                <input
                  className="form-control"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +20 100 000 0000"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === "ar" ? "المسمى الوظيفي" : "Job Title"}
                </label>
                <input
                  className="form-control"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === "ar" ? "القطاع / الإدارة (Department)" : "Department / Sector"}
                </label>
                <select
                  className="form-control"
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                >
                  <option value="">{lang === "ar" ? "-- اختر القطاع --" : "-- Select Department --"}</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === "ar" ? "المدير المباشر (Direct Manager)" : "Direct Manager"}
                </label>
                <select
                  className="form-control"
                  value={directManagerId}
                  onChange={e => setDirectManagerId(e.target.value)}
                >
                  <option value="">{lang === "ar" ? "-- لا يوجد مدير مباشر (رئيس قطاع/قيادي) --" : "-- No Direct Manager (Lead) --"}</option>
                  {allUsers.filter(u => u.id !== userId).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.job_title || u.role})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === "ar" ? "الوحدة / الفرع (Unit / Branch)" : "Unit / Branch"}
                </label>
                <input
                  className="form-control"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="e.g. Cairo HQ Branch"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === "ar" ? "الأحرف الأولى للرمز (Avatar Initials)" : "Avatar Initials"}
                </label>
                <input
                  className="form-control"
                  maxLength={3}
                  value={avatarInitials}
                  onChange={e => setAvatarInitials(e.target.value.toUpperCase())}
                  placeholder="e.g. AH"
                />
              </div>

              {/* Business Groups Checklist */}
              <div className="form-group" style={{ gridColumn: "span 2", marginTop: 10 }}>
                <label className="form-label" style={{ fontWeight: 800, marginBottom: 8 }}>
                  👥 {lang === "ar" ? "العضوية بمجموعات العمل (Business Groups):" : "Business Groups Membership:"}
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, background: "var(--color-bg)", padding: 12, borderRadius: 8, border: "1px solid var(--color-border)" }}>
                  {businessGroups.map(group => {
                    const isChecked = selectedGroupIds.includes(group.id);
                    return (
                      <label key={group.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleGroup(group.id)}
                        />
                        <span style={{ fontWeight: isChecked ? 700 : 400 }}>{group.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

            </form>
          </div>
        )}

        {/* TAB 2: ROLE & PERMISSIONS */}
        {activeTab === "role" && (
          <div className="card" style={{ padding: 24, border: "1px solid var(--color-border)", borderRadius: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>
              🔑 {lang === "ar" ? "اختيار الدور القيادي والصلاحيات:" : "System Role & Privileges:"}
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, background: selectedRoles.includes("admin") ? "var(--color-primary-light)" : "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="userRole"
                  value="admin"
                  checked={selectedRoles.includes("admin")}
                  onChange={() => toggleRole("admin")}
                  style={{ marginTop: 4 }}
                />
                <div>
                  <strong style={{ fontSize: 13 }}>👑 {lang === "ar" ? "مدير عام النظام (System Admin)" : "System Admin"}</strong>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {lang === "ar" ? "صلاحيات كاملة لإدارة المستخدمين، الهيكل الإداري، اللوائح والسياسات، وبناء مسارات الاعتمادات." : "Full system access to manage users, org chart, policies, and workflows."}
                  </div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, background: selectedRoles.includes("selfservice") ? "var(--color-primary-light)" : "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="userRole"
                  value="selfservice"
                  checked={selectedRoles.includes("selfservice")}
                  onChange={() => toggleRole("selfservice")}
                  style={{ marginTop: 4 }}
                />
                <div>
                  <strong style={{ fontSize: 13 }}>👤 {lang === "ar" ? "موظف ذاتي الخدمة (Self-Service Employee)" : "Self-Service Employee"}</strong>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {lang === "ar" ? "صلاحية تقديم طلبات جديدة عبر البوابة ومتابعة حالة التذاكر الخاصة به فقط." : "Ability to submit new requests and track personal tickets."}
                  </div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, background: selectedRoles.includes("agent") ? "var(--color-primary-light)" : "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="userRole"
                  value="agent"
                  checked={selectedRoles.includes("agent")}
                  onChange={() => toggleRole("agent")}
                  style={{ marginTop: 4 }}
                />
                <div>
                  <strong style={{ fontSize: 13 }}>🛡️ {lang === "ar" ? "وكيل دعم (Agent)" : "Agent"}</strong>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {lang === "ar" ? "صلاحية عرض الطلبات داخل القطاع وتمثيل العملاء في معالجة التذاكر." : "Ability to view requests within department and assist in ticket processing."}
                  </div>
                </div>
              </label>
  
              <div style={{ marginTop: 16, borderTop: "1px dashed var(--color-border)", paddingTop: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={canAssignGroupTickets}
                    onChange={(e) => setCanAssignGroupTickets(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <div>
                    <strong style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
                      {lang === "ar" ? "تفويض تعيين التذاكر للمجموعة (Group Ticket Assignment)" : "Group Ticket Assignment Delegation"}
                    </strong>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                      {lang === "ar" ? "يسمح للموظف بتعيين وتوزيع التذاكر الموجهة لمجموعته على زملائه." : "Allows this employee to assign group-routed tickets to specific team members."}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB: LOGIN & SECURITY */}
        {activeTab === "security" && (
          <div className="card" style={{ padding: 24, border: "1px solid var(--color-border)", borderRadius: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>
              🔐 {lang === "ar" ? "إعدادات تسجيل الدخول (Sign-in & Security):" : "Sign-in & Security Settings:"}
            </h3>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 18px" }}>
              {lang === "ar" ? "حدد كيف يسجل هذا الموظف دخوله، واسم المستخدم/كلمة المرور للدخول المحلي." : "Choose how this employee signs in, and set their username/password for local (password) sign-in."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 800 }}>
                  {lang === "ar" ? "طريقة تسجيل الدخول (Sign-in Method):" : "Sign-in Method:"}
                </label>
                <select className="form-control" value={authType} onChange={e => setAuthType(e.target.value)}>
                  <option value="password">Username / Password</option>
                  <option value="microsoft">Microsoft 365 (SSO)</option>
                  <option value="both">Both password & Microsoft 365</option>
                </select>
              </div>

              {(authType === "password" || authType === "both") && (
                <>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      {lang === "ar" ? "اسم المستخدم (Username)" : "Username"}
                    </label>
                    <input
                      className="form-control"
                      value={securityUsername}
                      onChange={e => setSecurityUsername(e.target.value)}
                      placeholder="e.g. ahmed.mohamed"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      {lang === "ar" ? "كلمة المرور الجديدة (New Password)" : "New Password"}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      value={securityPassword}
                      onChange={e => setSecurityPassword(e.target.value)}
                      placeholder={hasPassword ? (lang === "ar" ? "اتركها فارغة للإبقاء على كلمة المرور الحالية" : "Leave blank to keep current password") : (lang === "ar" ? "أدخل كلمة مرور أولية" : "Set initial password")}
                    />
                    {hasPassword && (
                      <div style={{ fontSize: 11, color: "#059669", marginTop: 4 }}>✓ Password is set. Leave blank to keep it.</div>
                    )}
                  </div>
                </>
              )}

              {authType === "microsoft" && (
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px" }}>
                  ☁ {lang === "ar" ? "هذا الموظف سيسجل دخوله بحسابه في Microsoft 365 (بريده الرسمي). تأكد من أن البريد الإلكتروني في بياناته يطابق بريده العملي تماماً، وأن إعدادات Microsoft 365 مفعّلة من صفحة الإعدادات." : "This employee will sign in with their Microsoft 365 work account. Make sure their email matches their corporate email exactly, and that Microsoft 365 integration is enabled in Settings."}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DELEGATION & OUT OF OFFICE */}
        {activeTab === "delegation" && (
          <div className="card" style={{ padding: 24, border: "1px solid var(--color-border)", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>
                  ✈️ {lang === "ar" ? "إعدادات التفويض والإجازات الرسمية (Out of Office Delegation):" : "Out of Office Delegation Settings:"}
                </h3>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                  {lang === "ar" ? "تحويل كافة طلبات الاعتماد الموجهة للمستخدم تلقائياً إلى موظف بديل أثناء فترة الإجازة." : "Automatically reroute incoming approval requests to a designated delegate during leave."}
                </div>
              </div>
              
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontWeight: 800 }}>
                <input
                  type="checkbox"
                  checked={delegationEnabled}
                  onChange={e => setDelegationEnabled(e.target.checked)}
                />
                {lang === "ar" ? "تفعيل التفويض التلقائي" : "Enable Auto-Delegation"}
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, opacity: delegationEnabled ? 1 : 0.5, pointerEvents: delegationEnabled ? "auto" : "none" }}>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label" style={{ fontWeight: 800 }}>
                  {lang === "ar" ? "الموظف البديل المفوض لاستلام الطلبات *" : "Designated Delegate Employee *"}
                </label>
                <select
                  className="form-control"
                  value={delegatedUserId}
                  onChange={e => setDelegatedUserId(e.target.value)}
                >
                  <option value="">{lang === "ar" ? "-- اختر الموظف المفوض --" : "-- Select Delegate User --"}</option>
                  {allUsers.filter(u => u.id !== userId).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.job_title || u.role})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === "ar" ? "تاريخ بداية التفويض" : "Delegation Start Date"}
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={delegationStartDate}
                  onChange={e => setDelegationStartDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === "ar" ? "تاريخ نهاية التفويض" : "Delegation End Date"}
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={delegationEndDate}
                  onChange={e => setDelegationEndDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {lang === "ar" ? "ملاحظات / سبب التفويض" : "Delegation Notes"}
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={delegationNotes}
                  onChange={e => setDelegationNotes(e.target.value)}
                  placeholder="e.g. Annual leave delegation"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DIRECT REPORTS */}
        {activeTab === "reports" && (
          <div className="card" style={{ padding: 24, border: "1px solid var(--color-border)", borderRadius: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>
              👥 {lang === "ar" ? `المرؤوسون التابعون لهذا المستخدم (${directReports.length}):` : `Direct Reports (${directReports.length}):`}
            </h3>
            
            {directReports.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "var(--color-text-muted)", background: "var(--color-bg)", borderRadius: 8 }}>
                {lang === "ar" ? "لا يوجد موظفون مسجلون يتبعون هذا المستخدم كمدير مباشر حالياً." : "No employees currently report to this user as direct manager."}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {directReports.map(rep => (
                  <div key={rep.id} style={{ display: "flex", gap: 12, alignItems: "center", background: "var(--color-bg)", padding: 12, borderRadius: 8, border: "1px solid var(--color-border)" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--color-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>
                      {rep.avatar_initials || rep.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{rep.name}</div>
                      <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{rep.job_title || rep.email}</div>
                    </div>
                    <Link href={`/admin/users/${rep.id}`}>
                      <button className="btn btn-outline btn-xs">{lang === "ar" ? "✏️ عرض" : "✏️ View"}</button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </AuthGuard>
  );
}
