"use client";
import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { SystemUser } from "@/lib/engine/iamStore";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { safeStorage } from "@/lib/safeStorage";

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

interface TopbarUser {
  id: string;
  name: string;
  role: string;
  avatar_initials?: string;
  email?: string;
}

export function Topbar() {
  const pathname = usePathname();
  const { lang, toggleLanguage } = useLanguage();
  const { data: session } = useSession();

  const sessionUserId = (session?.user?.id as string) || "";
  const sessionRole = (session?.user?.role as string) || "";
  const sessionRoles = (session?.user?.roles as string[]) || [sessionRole];
  const isSessionAdmin = sessionRole === "admin" || sessionRoles.includes("admin");

  const [currentUser, setCurrentUser] = useState<TopbarUser | null>(null);
  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [showMobileUserDrawer, setShowMobileUserDrawer] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (!sessionUserId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { fetchSystemUsersAction } = await import("@/app/actions/workflowActions");
        const fetched = (await fetchSystemUsersAction()) as SystemUser[];
        if (cancelled) return;
        if (fetched && fetched.length > 0) setUsersList(fetched);

        // Check if there is an active simulated user stored
        const savedSimulatedId = safeStorage.getItem("simulated_user_id");
        if (savedSimulatedId && savedSimulatedId !== sessionUserId) {
          setIsSimulating(true);
          const simulatedFound = fetched?.find((u) => u.id === savedSimulatedId);
          if (simulatedFound) {
            setCurrentUser(simulatedFound as unknown as TopbarUser);
            safeStorage.setItem("system_user", JSON.stringify(simulatedFound));
            return;
          }
        } else {
          setIsSimulating(false);
        }

        const found =
          fetched?.find((u) => u.id === sessionUserId) ||
          ({
            id: sessionUserId,
            name: session?.user?.name || "User",
            role: sessionRole,
            avatar_initials: (session?.user?.name || "U").substring(0, 2).toUpperCase(),
            email: session?.user?.email || "",
          } as SystemUser);
        if (found) {
          setCurrentUser(found as unknown as TopbarUser);
          safeStorage.setItem("system_user", JSON.stringify(found));
        }
      } catch (e) {
        if (!cancelled) {
          const savedSimulatedId = safeStorage.getItem("simulated_user_id");
          if (savedSimulatedId && savedSimulatedId !== sessionUserId) {
            setIsSimulating(true);
            const rawUser = safeStorage.getItem("system_user");
            if (rawUser) {
              try {
                const parsed = JSON.parse(rawUser);
                if (parsed && parsed.id === savedSimulatedId) {
                  setCurrentUser(parsed);
                  return;
                }
              } catch (err) {}
            }
          } else {
            setIsSimulating(false);
          }
          setCurrentUser({
            id: sessionUserId,
            name: session?.user?.name || "User",
            role: sessionRole,
            avatar_initials: (session?.user?.name || "U").substring(0, 2).toUpperCase(),
            email: session?.user?.email || "",
          });
        }
      }
    };
    load();

    const handleSwitch = () => {
      const savedId = safeStorage.getItem("simulated_user_id");
      if (savedId && savedId !== sessionUserId) {
        setIsSimulating(true);
        if (usersList.length > 0) {
          const found = usersList.find((u) => u.id === savedId);
          if (found) {
            setCurrentUser(found as unknown as TopbarUser);
          }
        }
      } else {
        setIsSimulating(false);
        const selfFound = usersList.find((u) => u.id === sessionUserId);
        if (selfFound) setCurrentUser(selfFound as unknown as TopbarUser);
      }
    };

    window.addEventListener("user-simulated-switch", handleSwitch);
    window.addEventListener("system_user_changed", handleSwitch);

    return () => {
      cancelled = true;
      window.removeEventListener("user-simulated-switch", handleSwitch);
      window.removeEventListener("system_user_changed", handleSwitch);
    };
  }, [sessionUserId, sessionRole, session?.user?.name, session?.user?.email, usersList.length]);

  const handleSwitchUser = (userId: string) => {
    if (userId === sessionUserId) {
      handleExitSimulation();
      return;
    }
    const found = usersList.find((u) => u.id === userId);
    if (found) {
      setIsSimulating(true);
      setCurrentUser(found as unknown as TopbarUser);
      safeStorage.setItem("simulated_user_id", userId);
      safeStorage.setItem("system_user", JSON.stringify(found));
      window.dispatchEvent(new Event("user-simulated-switch"));
      window.dispatchEvent(new Event("system_user_changed"));
    }
  };

  const handleExitSimulation = () => {
    safeStorage.removeItem("simulated_user_id");
    safeStorage.removeItem("system_user");
    setIsSimulating(false);
    const selfFound = usersList.find((u) => u.id === sessionUserId);
    if (selfFound) {
      setCurrentUser(selfFound as unknown as TopbarUser);
      safeStorage.setItem("system_user", JSON.stringify(selfFound));
    }
    window.dispatchEvent(new Event("user-simulated-switch"));
    window.dispatchEvent(new Event("system_user_changed"));
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      const { logoutAction } = await import("@/app/actions/authActions");
      await logoutAction();
    } catch (e) {}
    safeStorage.removeItem("simulated_user_id");
    safeStorage.removeItem("system_user");
    window.location.href = "/login";
  };

  const displayUser: TopbarUser = useMemo(
    () =>
      currentUser || {
        id: sessionUserId,
        name: session?.user?.name || ["W", "O"],
        role: sessionRole,
        avatar_initials: (session?.user?.name || "WO").substring(0, 2).toUpperCase(),
        email: session?.user?.email || "",
      } as unknown as TopbarUser,
    [currentUser, sessionUserId, sessionRole, session?.user?.name, session?.user?.email],
  );

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

          {/* 🔔 Notification Bell — beside language & profile on all viewports */}
          {displayUser.id && <NotificationBell currentUserId={displayUser.id} />}

          {/* ↩️ Exit Simulation Button (Visible whenever simulation is active) */}
          {isSimulating && (
            <button
              onClick={handleExitSimulation}
              title={lang === "ar" ? "إنهاء وضع المحاكاة والعودة لحساب الآدمن" : "Exit simulation & return to Admin"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#FEF3C7",
                border: "1px solid #F59E0B",
                padding: "5px 12px",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 800,
                color: "#B45309",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                animation: "pulse 2s infinite"
              }}
            >
              <span>↩️</span>
              <span>{lang === "ar" ? "إنهاء المحاكاة (العودة للآدمن)" : "Exit Simulation"}</span>
            </button>
          )}

          {/* Desktop IAM User Simulator Dropdown (admins or active simulation) */}
          {(isSessionAdmin || isSimulating) && displayUser.id && (
            <div className="desktop-only" style={{ display: "flex", alignItems: "center", gap: 6, background: isSimulating ? "#FEF3C7" : "var(--color-primary-light)", padding: "4px 10px", borderRadius: "var(--radius-md)", border: isSimulating ? "1px solid #F59E0B" : "1px solid #BFDBFE" }} suppressHydrationWarning>
              <span style={{ fontSize: 11, fontWeight: 700, color: isSimulating ? "#B45309" : "var(--color-primary)" }}>🔑 IAM User:</span>
              <select
                className="form-control"
                style={{ fontSize: 12, padding: "2px 6px", border: "none", background: "none", fontWeight: 700, color: "var(--color-text-primary)", width: "auto" }}
                value={displayUser.id}
                onChange={(e) => handleSwitchUser(e.target.value)}
                suppressHydrationWarning
               >
                  {(usersList.length ? usersList : []).map((u) => {
                    const roles = Array.isArray((u as any).roles) && (u as any).roles.length ? (u as any).roles : [(u as any).role];
                    const roleText = roles.map((r: string) => r === 'admin' ? 'ADMIN' : r === 'agent' ? 'AGENT' : 'SELF SERVICE').join(', ');
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name} ({roleText})
                      </option>
                    );
                  })}
               </select>
            </div>
          )}

          {/* Mobile IAM Quick Switcher Trigger (Opens Drawer) */}
          {(isSessionAdmin || isSimulating) && displayUser.id && (
            <button
              className="mobile-only-user-btn"
              onClick={() => setShowMobileUserDrawer(true)}
              title={`Active User: ${displayUser.name} (${displayUser.role}). Tap to switch user.`}
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
              <span>👤 {displayUser.avatar_initials}</span>
            </button>
          )}

          <div className="topbar-avatar desktop-only" title={displayUser.name} suppressHydrationWarning>
            {displayUser.avatar_initials}
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              padding: "5px 10px",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 800,
              color: "#EF4444",
            }}
          >
            <span>⎋</span>
            <span className="desktop-only">Sign out</span>
          </button>
        </div>
      </header>

      {/* 📱 DEDICATED MOBILE USER SELECTOR BOTTOM SHEET DRAWER */}
      {showMobileUserDrawer && (isSessionAdmin || isSimulating) && (
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
                const isSelected = u.id === displayUser.id;
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
                      {(u as any).avatar_initials || u.name?.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: isSelected ? "var(--color-primary)" : "var(--color-text-primary)" }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                        {(u as any).job_title || (u as any).role} · {(u as any).department_id || "Enterprise"}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 8,
                        fontSize: 10,
                        fontWeight: 800,
                        background: (u as any).role === "admin" ? "#FEF3C7" : (u as any).role === "agent" ? "#DBEAFE" : "#F3F4F6",
                        color: (u as any).role === "admin" ? "#92400E" : (u as any).role === "agent" ? "#1E40AF" : "#374151",
                      }}
                    >
                      {(u as any).role === "admin" ? "ADMIN" : (u as any).role === "agent" ? "AGENT" : "SELF SERVICE"}
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
