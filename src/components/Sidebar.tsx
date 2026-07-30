"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SYSTEM_USERS, SystemUser, DEFAULT_ROLE_PERMISSIONS } from "@/lib/engine/iamStore";
import { fetchRolePermissionsAction } from "@/app/actions/workflowActions";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface NavItem {
  href: string;
  icon: string;
  labelEn: string;
  labelAr: string;
  moduleKey: string;
}

interface NavGroup {
  sectionEn: string;
  sectionAr: string;
  items: NavItem[];
}

const NAV_ITEMS: NavGroup[] = [
  {
    sectionEn: "Main",
    sectionAr: "الرئيسية",
    items: [
      { href: "/", icon: "⊞", labelEn: "Dashboard", labelAr: "لوحة التحكم", moduleKey: "dashboard" },
      { href: "/requests/new", icon: "＋", labelEn: "New Request", labelAr: "طلب جديد", moduleKey: "newRequest" },
      { href: "/requests", icon: "📋", labelEn: "My Requests", labelAr: "طلباتي", moduleKey: "myRequests" },
      { href: "/approvals", icon: "✅", labelEn: "Pending Approvals", labelAr: "بانتظار الاعتماد", moduleKey: "pendingApprovals" },
    ],
  },
  {
    sectionEn: "Workflows",
    sectionAr: "المسارات والخدمات",
    items: [
      { href: "/workflows", icon: "⚡", labelEn: "Requests Catalog Editor", labelAr: "محرر كتالوج الطلبات", moduleKey: "workflowBuilder" },
      { href: "/admin/builder", icon: "🔧", labelEn: "Workflow & Rules Builder", labelAr: "مصمم المسارات وقواعد العمل", moduleKey: "workflowBuilder" },
    ],
  },
  {
    sectionEn: "Admin",
    sectionAr: "الإدارة والنظام",
    items: [
      { href: "/admin/org-chart", icon: "🏢", labelEn: "Org Chart Hierarchy", labelAr: "الهيكل التنظيمي للشركة", moduleKey: "usersIam" },
      { href: "/admin/budgets", icon: "💰", labelEn: "Budgets & Allocations", labelAr: "ميزانيات الأقسام والمالية", moduleKey: "settings" },
      { href: "/admin/policies", icon: "📜", labelEn: "Policies & Regulations", labelAr: "اللوائح والسياسات العامة", moduleKey: "settings" },
      { href: "/admin/users", icon: "👥", labelEn: "Users & IAM", labelAr: "المستخدمين والصلاحيات", moduleKey: "usersIam" },
      { href: "/admin/profiles", icon: "🛡️", labelEn: "Profile Setup", labelAr: "إعدادات البروفايل", moduleKey: "profileSetup" },
      { href: "/admin/reports", icon: "📊", labelEn: "Reports & SLA", labelAr: "التقارير واتفاقيات الخدمة", moduleKey: "reportsSla" },
      { href: "/admin/settings", icon: "⚙", labelEn: "Settings & Feature Flags", labelAr: "الإعدادات ومراقب النظام", moduleKey: "settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Initialize with deterministic default matching SSR (SYSTEM_USERS[0]) to prevent Hydration Mismatch
  const [currentUser, setCurrentUser] = useState<SystemUser>(SYSTEM_USERS[0]);
  const [permissionsMap, setPermissionsMap] = useState<Record<string, any>>(DEFAULT_ROLE_PERMISSIONS);

  const loadSimulatedData = async () => {
    const savedId = localStorage.getItem("simulated_user_id");
    if (savedId) {
      const found = SYSTEM_USERS.find((u) => u.id === savedId);
      if (found) setCurrentUser(found);
    }

    try {
      const perms = await fetchRolePermissionsAction();
      if (perms) setPermissionsMap(perms);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadSimulatedData();
    const handleUserSwitch = () => loadSimulatedData();
    const handleMobileToggle = () => setMobileOpen((prev) => !prev);
    const handleMobileClose = () => setMobileOpen(false);

    window.addEventListener("user-simulated-switch", handleUserSwitch);
    window.addEventListener("profile-permissions-updated", handleUserSwitch);
    window.addEventListener("mobile-sidebar-toggle", handleMobileToggle);
    window.addEventListener("mobile-sidebar-close", handleMobileClose);

    return () => {
      window.removeEventListener("user-simulated-switch", handleUserSwitch);
      window.removeEventListener("profile-permissions-updated", handleUserSwitch);
      window.removeEventListener("mobile-sidebar-toggle", handleMobileToggle);
      window.removeEventListener("mobile-sidebar-close", handleMobileClose);
    };
  }, []);

  // Close mobile sidebar on route navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const { lang } = useLanguage();
  const currentRoleCode = currentUser.role;
  const activeRoleModules = permissionsMap[currentRoleCode]?.modules || DEFAULT_ROLE_PERMISSIONS[currentRoleCode]?.modules || {};

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <div>
            <div className="sidebar-logo-text">WorkflowOS</div>
            <div className="sidebar-logo-sub">Approval Engine v2.0</div>
          </div>
          {/* Close button for mobile drawer */}
          <button
            className="mobile-sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            title="Close menu"
          >
            ✕
          </button>
        </div>

      {/* Render Navigation items */}
      {NAV_ITEMS.map((group) => {
        const visibleItems = group.items.filter((item) => {
          return activeRoleModules[item.moduleKey] === true;
        });

        if (visibleItems.length === 0) return null;

        const sectionTitle = lang === "ar" ? group.sectionAr : group.sectionEn;

        return (
          <div key={group.sectionEn} className="sidebar-section">
            <div className="sidebar-section-label">{sectionTitle}</div>
            {visibleItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const labelText = lang === "ar" ? item.labelAr : item.labelEn;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  <span className="sidebar-nav-label">{labelText}</span>
                </Link>
              );
            })}
          </div>
        );
      })}

      {/* User Profile Footer (with suppressHydrationWarning for dynamic simulated user) */}
      <div className="sidebar-footer" suppressHydrationWarning>
        <div className="sidebar-user" suppressHydrationWarning>
          <div className="avatar a" suppressHydrationWarning>{currentUser.avatar_initials}</div>
          <div suppressHydrationWarning>
            <div className="sidebar-user-name" suppressHydrationWarning>{currentUser.name}</div>
            <div className="sidebar-user-role" style={{ textTransform: "uppercase", fontSize: 10, color: "var(--color-primary)" }} suppressHydrationWarning>
              {currentUser.role} · {currentUser.department_id.replace("dept-", "").toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </aside>
  </>
  );
}
