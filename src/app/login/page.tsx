"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  loginWithPasswordAction,
  startMicrosoftSignInAction,
} from "@/app/actions/authActions";
import { safeStorage } from "@/lib/safeStorage";

const ERROR_MESSAGES: Record<string, string> = {
  not_provisioned:
    "No account is linked to this Microsoft 365 email. Registration is disabled — please contact an administrator to create your account.",
  password_only:
    "This account is configured for password sign-in, not Microsoft 365. Please sign in with your username and password.",
  oauth_failed: "Microsoft sign-in was cancelled or failed. Please try again.",
  state_mismatch: "Your sign-in request could not be verified. Please try again.",
  token_exchange: "Microsoft could not complete the sign-in. Please try again.",
  graph_failed: "Could not retrieve your Microsoft 365 profile.",
  session: "Could not create your session. Please try again.",
  config: "Microsoft 365 sign-in is not configured yet.",
  no_email: "Microsoft did not return an email address for your account.",
  internal: "An unexpected error occurred. Please try again.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorKey = searchParams.get("error") || "";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorKey ? ERROR_MESSAGES[errorKey] || "Sign-in failed. Please try again." : null,
  );

  useEffect(() => {
    // Clear any stale simulated user state on the login screen
    safeStorage.removeItem("simulated_user_id");
    safeStorage.removeItem("system_user");
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("simulated_user_id");
        localStorage.removeItem("system_user");
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl.startsWith("/") ? callbackUrl : "/");
    }
  }, [status, router, callbackUrl]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      safeStorage.removeItem("simulated_user_id");
      safeStorage.removeItem("system_user");
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("simulated_user_id");
          localStorage.removeItem("system_user");
        } catch (e) {}
      }
      const fd = new FormData();
      fd.set("username", username);
      fd.set("password", password);
      fd.set("callbackUrl", callbackUrl);
      const res = await loginWithPasswordAction(fd);
      if (res && (res as any).ok) {
        router.push((res as any).redirectTo || "/");
        router.refresh();
      } else {
        setError((res as any)?.error || "Sign-in failed.");
      }
    } catch (err) {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoft = async () => {
    setError(null);
    setMsLoading(true);
    try {
      const res = await startMicrosoftSignInAction(callbackUrl);
      if (res && (res as any).url) {
        window.location.href = (res as any).url;
      } else {
        setError((res as any)?.error || "Microsoft 365 sign-in is unavailable.");
        setMsLoading(false);
      }
    } catch (err) {
      setError("Could not start Microsoft sign-in. Please try again.");
      setMsLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={styles.logo}>⚙️</div>
          <h1 style={styles.title}>Macro Workflow System</h1>
          <p style={styles.subtitle}>Enterprise Workflow &amp; Approval Engine</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <strong>Sign-in error:</strong> {error}
          </div>
        )}

        <button className="btn btn-primary" onClick={handleMicrosoft} disabled={msLoading} style={styles.msButton}>
          {msLoading ? "Redirecting to Microsoft..." : "☁ Sign in with Microsoft 365"}
        </button>

        <div style={styles.divider}>
          <span>or sign in with your work credentials</span>
        </div>

        <form onSubmit={handlePasswordLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Username or Email</label>
            <input
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="e.g. ahmed or ahmed@company.com"
              required
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={styles.footnote}>
          Accounts are provisioned by your administrator. Public self-registration is disabled.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "#ffffff",
    borderRadius: 16,
    padding: "32px 28px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
  },
  logo: { fontSize: 44, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 900, margin: 0, color: "#0f172a" },
  subtitle: { fontSize: 12, color: "#64748b", margin: "4px 0 0" },
  errorBox: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#991B1B",
    fontSize: 12,
    padding: "10px 14px",
    borderRadius: 8,
    marginBottom: 16,
  },
  msButton: { width: "100%", fontSize: 14, padding: 12 },
  divider: {
    textAlign: "center",
    fontSize: 11,
    color: "#94a3b8",
    margin: "18px 0 14px",
    position: "relative",
  },
  footnote: { fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 18 },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
