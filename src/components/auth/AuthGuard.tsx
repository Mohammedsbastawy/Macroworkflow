"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { SystemUser, DEFAULT_ROLE_PERMISSIONS } from "@/lib/engine/iamStore";
import { safeStorage } from "@/lib/safeStorage";

export interface AuthGuardProps {
  children: React.ReactNode;
  requiredModule?: keyof typeof DEFAULT_ROLE_PERMISSIONS.admin.modules;
  allowRoles?: Array<'admin' | 'selfservice' | 'agent'>;
}

/**
 * Build a minimal SystemUser directly from the NextAuth session data.
 * Used as an immediate fallback so we never show "You are not signed in"
 * to an already-authenticated user while the async DB lookup is in flight.
 */
function buildUserFromSession(session: any): SystemUser {
  const rawRole = (session?.user?.role as string) || "selfservice";
  const role = (["admin", "selfservice", "agent"].includes(rawRole)
    ? rawRole
    : "selfservice") as SystemUser["role"];
  return {
    id: session?.user?.id || "",
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    department_id: "",
    group_ids: [],
    role,
    roles: (session?.user?.roles as SystemUser["roles"]) || [role],
    avatar_initials:
      (session?.user?.name || "?")
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?",
  };
}

export function AuthGuard({ children, requiredModule, allowRoles }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const [dbUser, setDbUser] = useState<SystemUser | null>(null);
  const [simulatedUser, setSimulatedUser] = useState<SystemUser | null>(null);

  const sessionUserId = (session?.user?.id as string) || "";

  useEffect(() => {
    if (status !== "authenticated" || !sessionUserId) return;
    let cancelled = false;

    const resolve = async () => {
      try {
        const { fetchSystemUsersAction } = await import("@/app/actions/workflowActions");
        const dbUsers = await fetchSystemUsersAction();
        if (cancelled) return;

        const foundSessionUser = dbUsers.find((u: any) => u.id === sessionUserId);
        if (foundSessionUser) {
          setDbUser(foundSessionUser as any);
        }

        const savedSimulatedId = safeStorage.getItem("simulated_user_id");
        if (savedSimulatedId && savedSimulatedId !== sessionUserId) {
          const foundSim = dbUsers.find((u: any) => u.id === savedSimulatedId);
          if (foundSim) {
            setSimulatedUser(foundSim as any);
            safeStorage.setItem("system_user", JSON.stringify(foundSim));
          } else {
            setSimulatedUser(null);
          }
        } else {
          setSimulatedUser(null);
          if (savedSimulatedId === sessionUserId) {
            safeStorage.removeItem("simulated_user_id");
          }
          if (foundSessionUser) {
            safeStorage.setItem("system_user", JSON.stringify(foundSessionUser));
          }
        }
      } catch (e) {
        console.error("Failed to resolve authenticated user in AuthGuard:", e);
      }
    };

    resolve();

    const handleSwitch = () => {
      resolve();
    };

    window.addEventListener("user-simulated-switch", handleSwitch);
    window.addEventListener("system_user_changed", handleSwitch);

    return () => {
      cancelled = true;
      window.removeEventListener("user-simulated-switch", handleSwitch);
      window.removeEventListener("system_user_changed", handleSwitch);
    };
  }, [status, sessionUserId]);

  // Still initialising NextAuth session — show a brief loading state.
  if (status === "loading") {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
        🔒 Verifying enterprise permissions & security credentials...
      </div>
    );
  }

  // Not logged in at all → show sign-in prompt.
  if (status === "unauthenticated") {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>You are not signed in.</div>
        <Link href="/login">
          <button className="btn btn-primary">Sign in</button>
        </Link>
      </div>
    );
  }

  // User IS authenticated — use simulated user if active for testing, or rich DB record,
  // otherwise fall back to session data so we never flash the sign-in screen.
  const currentUser: SystemUser = simulatedUser || dbUser || buildUserFromSession(session);

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