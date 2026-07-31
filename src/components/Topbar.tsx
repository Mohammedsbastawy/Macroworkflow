"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { SYSTEM_USERS, SystemUser } from "@/lib/engine/iamStore";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const ROUTE_LABELS: Record<string, { breadcrumb: string[]; titleEn: string; titleAr: string }> = {
  "/": { breadcrumb: [], titleEn: "Dashboard", titleAr: "لوحة التحكم" },
  "/requests": { breadcrumb: ["Requests"], titleEn: "Requests", titleAr: "الطلبات" },
  "/my-requests": { breadcrumb: ["Requests"], titleEn: "My Requests", titleAr: "طلباتي" },
  "/requests/new": { breadcrumb: ["Requests"], titleEn: "New Request", titleAr: "طلب جديد" },
  "/workflows": { breadcrumb: [], titleEn: "Requests Catalog Editor", titleAr: "محرر كتالوج الطلبات" },
  "/workflows/form-builder": { breadcrumb: ["Requests Catalog Editor"], titleEn: "Form Builder", titleAr: "مصمم الاستمارات" },
  "/admin/builder": { breadcrumb: ["Workflows"], titleEn: "Workflow & Rules Builder", titleAr: "مصمم المسارات وقواعد العمل" },
  "/admin/users": { breadcrumb: ["Admin"], titleEn: "Users & IAM Directory", titleAr: "دليل المستخدمين والصلاحيات" },
  "/admin/profiles": { breadcrumb: ["Admin", "IAM"], titleEn: "Profile Setup & Roles", titleAr: "إعدادات البروفايل والأدوار" },
  "/admin/reports": { breadcrumb: ["Admin"], titleEn: "Reports & SLA", titleAr: "التقارير واتفاقيات الخدمة" },
  "/admin/settings": { breadcrumb: ["Admin"], titleEn: "Settings", titleAr: "الإعدادات" },
};

export function Topbar() {
  const pathname = usePathname();
  const { lang, toggleLanguage } = useLanguage();
  
  const [currentUser, setCurrentUser] = useState<SystemUser>(SYSTEM_USERS[0]);
  const [usersList, setUsersList] = useState<SystemUser[]>(SYSTEM_USERS);
  const [showMobileUserDrawer, setShowMobileUserDrawer] = useState(false);

  const loadUser = async () => {
    try {
      const { fetchSystemUsersAction } = await import("@/app/actions/workflowActions");
      const fetched = await fetchSystemUsersAction();
      if (fetched && fetched.length > 0) {
        setUsersList(fetched as any);
        const savedId = localStorage.getItem("simulated_user_id");
        const found = fetched.find((u: any) => u.id === savedId) || fetched[0];
        if (found) {
          setCurrentUser(found as any);
          localStorage.setItem("system_user", JSON.stringify(found));
        }
      }
    } catch (e) {
      const savedId = localStorage.getItem("simulated_user_id");
      if (savedId) {
        const found = SYSTEM_USERS.find((u) => u.id === savedId);
        if (found) setCurrentUser(found);
      }
    }
  };

  useEffect(() => {
    loadUser();
    const handleSwitch = () => loadUser();
    window.addEventListener("user-simulated-switch", handleSwitch);
    return () => window.removeEventListener("user-simulated-switch", handleSwitch);
  }, []);

  const handleSwitchUser = (userId: string) => {
    const found = usersList.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem("simulated_user_id", userId);
      localStorage.setItem("system_user", JSON.stringify(found));
      window.dispatchEvent(new Event("user-simulated-switch"));
      window.dispatchEvent(new Event("system_user_changed"));
    }
  };

  const route = ROUTE_LABELS[pathname] ?? {
    breadcrumb: ["Requests"],
    titleEn: "Request Detail",
    titleAr: "تفاصيل الطلب",
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          {/* Mobile Hamburger Toggle Button */}
          <button
            className="mobile-hamburger-btn"
            onClick={() => window.dispatchEvent(new Event("mobile-sidebar-toggle"))}
            title="Toggle Navigation Menu"
          >
            ☰
          </button>
          <div className="topbar-breadcrumb">
            <span className="desktop-only" style={{ color: "var(--color-text-muted)" }}>WorkflowOS</span>
            {route.breadcrumb.map((crumb) => (
              <span key={crumb} className="desktop-only" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="sep">›</span>
                <span>{crumb}</span>
              </span>
            ))}
            {route.breadcrumb.length > 0 && <span className="sep desktop-only">›</span>}
            <span className="topbar-title-text" style={{ color: "var(--color-text-primary)", fontWeight: 800 }}>
              {lang === "ar" ? route.titleAr : route.titleEn}
            </span>
          </div>
        </div>

        <div className="topbar-right" suppressHydrationWarning>
          {/* Language Toggle Switcher */}
          <button
            onClick={toggleLanguage}
            title="Switch System Language (English / العربية)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              padding: "5px 10px",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 800,
              color: "var(--color-primary)",
              boxShadow: "var(--shadow-sm)",
              transition: "all 0.15s",
            }}
          >
            <span>🌐</span>
            <span>{lang === "en" ? "AR" : "EN"}</span>
          </button>

          {/* Desktop IAM User Simulator Dropdown Switcher */}
          <div className="desktop-only" style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--color-primary-light)", padding: "4px 10px", borderRadius: "var(--radius-md)", border: "1px solid #BFDBFE" }} suppressHydrationWarning>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)" }}>🔑 IAM User:</span>
            <select
              className="form-control"
              style={{ fontSize: 12, padding: "2px 6px", border: "none", background: "none", fontWeight: 700, color: "var(--color-text-primary)", width: "auto" }}
              value={currentUser.id}
              onChange={(e) => handleSwitchUser(e.target.value)}
              suppressHydrationWarning
            >
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Mobile IAM Quick Switcher Trigger (Opens Drawer) */}
          <button
            className="mobile-only-user-btn"
            onClick={() => setShowMobileUserDrawer(true)}
            title={`Active User: ${currentUser.name} (${currentUser.role}). Tap to switch user.`}
            style={{
              display: "none",
              alignItems: "center",
              gap: 4,
              background: "var(--color-primary-light)",
              border: "1px solid #BFDBFE",
              padding: "5px 10px",
              borderRadius: "var(--radius-md)",
              fontSize: 11,
              fontWeight: 800,
              color: "var(--color-primary)",
            }}
          >
            <span>👤 {currentUser.avatar_initials}</span>
          </button>

          <button className="icon-btn desktop-only" title="Notifications">
            🔔<span className="dot" />
          </button>
          <div className="topbar-avatar desktop-only" title={currentUser.name} suppressHydrationWarning>
            {currentUser.avatar_initials}
          </div>
        </div>
      </header>

      {/* 📱 DEDICATED MOBILE USER SELECTOR BOTTOM SHEET DRAWER */}
      {showMobileUserDrawer && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setShowMobileUserDrawer(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#FFFFFF",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: "20px 16px 30px",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 -10px 30px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Sheet Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: "var(--color-text-primary)" }}>
                  🔑 {lang === "ar" ? "اختر الموظف للمحاكاة" : "Select IAM User"}
                </h3>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  {lang === "ar" ? "اضغط على أي موظف للتبديل الفوري لصلاحياته" : "Tap any employee to switch context"}
                </div>
              </div>
              <button
                onClick={() => setShowMobileUserDrawer(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-text-muted)" }}
              >
                ✕
              </button>
            </div>

            {/* Users List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
              {usersList.map((u) => {
                const isSelected = u.id === currentUser.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      handleSwitchUser(u.id);
                      setShowMobileUserDrawer(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: isSelected ? "var(--color-primary-light)" : "var(--color-bg)",
                      border: `1px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: isSelected ? "var(--color-primary)" : "#6366F1",
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: 14,
                      }}
                    >
                      {u.avatar_initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: isSelected ? "var(--color-primary)" : "var(--color-text-primary)" }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                        {u.job_title || u.role} · {u.department_id || "Enterprise"}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 8,
                        fontSize: 10,
                        fontWeight: 800,
                        background: u.role === "admin" ? "#FEF3C7" : "#F3F4F6",
                        color: u.role === "admin" ? "#92400E" : "#374151",
                      }}
                    >
                      {u.role.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
