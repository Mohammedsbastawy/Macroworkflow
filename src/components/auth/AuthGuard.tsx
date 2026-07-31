"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SYSTEM_USERS, SystemUser, DEFAULT_ROLE_PERMISSIONS } from "@/lib/engine/iamStore";

export interface AuthGuardProps {
  children: React.ReactNode;
  requiredModule?: keyof typeof DEFAULT_ROLE_PERMISSIONS.admin.modules;
  allowRoles?: Array<'admin' | 'selfservice'>;
}

export function AuthGuard({ children, requiredModule, allowRoles }: AuthGuardProps) {
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const updateAuth = async () => {
      const stored = localStorage.getItem("system_user");
      let found = null;
      try {
        const { fetchSystemUsersAction } = await import("@/app/actions/workflowActions");
        const dbUsers = await fetchSystemUsersAction();
        if (stored) {
          const parsed = JSON.parse(stored);
          found = dbUsers.find((u: any) => u.id === parsed.id);
        }
        if (!found && dbUsers.length > 0) {
          // Check simulated_user_id too
          const savedId = localStorage.getItem("simulated_user_id");
          found = dbUsers.find((u: any) => u.id === savedId) || dbUsers[0];
        }
      } catch (e) {
        console.error(e);
      }

      if (found) {
        setCurrentUser(found as any);
        localStorage.setItem("system_user", JSON.stringify(found));
      } else {
        setCurrentUser(SYSTEM_USERS[0]);
      }
    };

    updateAuth();
    setIsHydrated(true);

    window.addEventListener("system_user_changed", updateAuth);
    return () => window.removeEventListener("system_user_changed", updateAuth);
  }, []);

  if (!isHydrated || !currentUser) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
        🔒 Verifying enterprise permissions & security credentials...
      </div>
    );
  }

  // 1. Role-based restriction check
  if (allowRoles && !allowRoles.includes(currentUser.role)) {
    return <AccessDeniedScreen currentUser={currentUser} reason={`Access restricted to roles: ${allowRoles.map(r => r.toUpperCase()).join(", ")}`} />;
  }

  // 2. Module permission check
  if (requiredModule) {
    const userRoleConfig = DEFAULT_ROLE_PERMISSIONS[currentUser.role] || DEFAULT_ROLE_PERMISSIONS.selfservice;
    const isModuleAllowed = userRoleConfig.modules?.[requiredModule] === true;

    if (!isModuleAllowed) {
      return <AccessDeniedScreen currentUser={currentUser} reason={`Your active role (${currentUser.role.toUpperCase()}) does not have permission to access the '${requiredModule}' module.`} />;
    }
  }

  return <>{children}</>;
}

function AccessDeniedScreen({ currentUser, reason }: { currentUser: SystemUser; reason: string }) {
  return (
    <div style={{
      maxWidth: 600,
      margin: "60px auto",
      padding: 32,
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 12,
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️⛔</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#EF4444", marginBottom: 8 }}>403 - Access Denied / غير مصرح بالدخول</h2>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
        عفواً، حسابك الحالي (<strong>{currentUser.name}</strong> - <code>{currentUser.role.toUpperCase()}</code>) لا يمتلك الصلاحيات الكافية للوصول إلى هذه الصفحة أو تعديل مسارات النظام.
      </p>
      <div style={{ fontSize: 11, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", padding: "10px 14px", borderRadius: 8, marginBottom: 24, textAlign: "right" }}>
        <strong>سبب الحظر (Security Audit Log):</strong> {reason}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Link href="/portal">
          <button className="btn btn-primary btn-sm">🏠 الذهاب لبوابة الموظف (Self-Service Portal)</button>
        </Link>
        <Link href="/requests/new">
          <button className="btn btn-outline btn-sm">📝 تقديم طلب جديد</button>
        </Link>
      </div>
    </div>
  );
}
