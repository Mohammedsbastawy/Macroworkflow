"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * Authenticate an employee with a local username/email + password.
 * Public self-registration is intentionally disabled — accounts are created
 * only by an administrator.
 */
export async function loginWithPasswordAction(formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const callbackUrl = safePath(formData.get("callbackUrl"));
  const redirectTo = callbackUrl || "/";

  if (!username || !password) {
    return { error: "Please enter your username and password." };
  }

  const { dbGet } = await import("@/lib/db/mysqlClient");
  const bcrypt = await import("bcryptjs");

  let user: any = null;
  try {
    const active = await dbGet("system_users", { is_active: 1 });
    user =
      active.find((u: any) => u.username === username) ||
      active.find((u: any) => (u.email || "").toLowerCase() === username.toLowerCase());
  } catch (e) {
    console.error("login lookup error:", e);
    return { error: "Sign-in is temporarily unavailable. Please try again." };
  }

  if (!user) {
    return { error: "Account not found. Please contact your administrator." };
  }

  const authType = (user.auth_type || "password").toLowerCase();
  if (authType !== "password" && authType !== "both") {
    return {
      error: "This account signs in with Microsoft 365. Please use the 'Sign in with Microsoft' button.",
    };
  }

  if (!user.password_hash) {
    return { error: "No password is set for this account. Contact your administrator." };
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return { error: "Incorrect username or password." };
  }

  const { signIn } = await import("@/lib/auth");
  try {
    await signIn("credentials", {
      type: "password",
      userId: user.id,
      password,
      redirect: false,
    });
  } catch (e) {
    return { error: "Could not create a secure session. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true, redirectTo };
}

/**
 * Generate the Microsoft Entra ID authorization URL (dynamic credentials from DB).
 */
export async function startMicrosoftSignInAction(callbackUrl?: string) {
  const { loadEntraSettings } = await import("@/lib/m365/settings");
  const { buildAuthorizeUrl } = await import("@/lib/m365/graph");

  let settings;
  try {
    settings = await loadEntraSettings();
  } catch (e) {
    return { error: "Failed to load Microsoft 365 configuration." };
  }

  if (!settings.enabled || !settings.tenantId || !settings.clientId || !settings.clientSecret) {
    return {
      error:
        "Microsoft 365 sign-in is not configured. Ask your administrator to configure it under Settings → Microsoft 365 Integration.",
    };
  }

  const state =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const cookieStore = await cookies();
  cookieStore.set(
    "m365_oauth_state",
    JSON.stringify({ state, redirectTo: safePath(callbackUrl) || "/" }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    },
  );

  const url = await buildAuthorizeUrl(settings, state);
  return { url };
}

/**
 * End the current session and return to the login page.
 */
export async function logoutAction() {
  const { signOut } = await import("@/lib/auth");
  try {
    await signOut({ redirect: false, redirectTo: "/login" });
  } catch (e) {
    // ignore — session may already be invalid
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

function safePath(value: FormDataEntryValue | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

/**
 * Load the configured Microsoft Entra ID settings (for the admin Settings page).
 * The client secret is masked — never returned in full.
 */
export async function getEntraSettingsAction() {
  const { loadEntraSettings, ENTRA_DEFAULT_SCOPES } = await import("@/lib/m365/settings");
  const { getRedirectUri } = await import("@/lib/m365/settings");
  const settings = await loadEntraSettings();
  const redirectUri = await getRedirectUri(settings);
  return {
    tenantId: settings.tenantId,
    clientId: settings.clientId,
    hasClientSecret: Boolean(settings.clientSecret),
    redirectUri,
    scopes: settings.scopes || ENTRA_DEFAULT_SCOPES,
    enabled: settings.enabled,
    defaultScopes: ENTRA_DEFAULT_SCOPES,
    senderEmail: settings.senderEmail || "",
    senderName: settings.senderName || "",
    mailEnabled: settings.mailEnabled,
  };
}

/**
 * Persist the Microsoft Entra ID settings to the database.
 */
export async function saveEntraSettingsAction(input: {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string; // empty/masked => keep the stored secret
  redirectUri?: string;
  scopes?: string;
  enabled?: boolean;
  senderEmail?: string;
  senderName?: string;
  mailEnabled?: boolean;
}) {
  const { saveEntraSettings, loadEntraSettings } = await import("@/lib/m365/settings");
  const current = await loadEntraSettings();

  let clientSecret = current.clientSecret;
  const secretInput = (input.clientSecret || "").trim();
  if (secretInput && !secretInput.includes("••")) {
    clientSecret = secretInput;
  } else if (input.clientSecret === "") {
    // explicit empty string clears only if currently empty already
  }

  await saveEntraSettings({
    tenantId: input.tenantId ?? current.tenantId,
    clientId: input.clientId ?? current.clientId,
    clientSecret,
    redirectUri: input.redirectUri ?? current.redirectUri,
    scopes: input.scopes ?? current.scopes,
    enabled: input.enabled ?? current.enabled,
    senderEmail: input.senderEmail ?? current.senderEmail,
    senderName: input.senderName ?? current.senderName,
    mailEnabled: input.mailEnabled ?? current.mailEnabled,
  });

  revalidatePath("/admin/settings");
  return { ok: true };
}
