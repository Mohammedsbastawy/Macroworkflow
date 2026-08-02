import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * OAuth2 authorization-code callback for Microsoft Entra ID.
 * Exchanges the code for tokens, verifies the user against the provisioned
 * system_users table, persists the M365 mailbox tokens, and mints a NextAuth
 * session. Public self-registration is disabled — unknown emails are rejected.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const base = (process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/$/, "");

  const cookieJar = await cookies();
  const savedRaw = cookieJar.get("m365_oauth_state")?.value;
  let saved: { state?: string; redirectTo?: string } = {};
  if (savedRaw) {
    try {
      saved = JSON.parse(savedRaw);
    } catch {
      saved = {};
    }
  }

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${base}/login?error=oauth_failed`);
  }
  if (!saved.state || saved.state !== state) {
    return NextResponse.redirect(`${base}/login?error=state_mismatch`);
  }
  const redirectTo = saved.redirectTo?.startsWith("/") ? saved.redirectTo : "/";

  const { loadEntraSettings } = await import("@/lib/m365/settings");
  const { exchangeCodeForToken, getMe, normalizeEmail } = await import("@/lib/m365/graph");

  let settings;
  try {
    settings = await loadEntraSettings();
  } catch {
    return NextResponse.redirect(`${base}/login?error=config`);
  }

  let tokens;
  try {
    tokens = await exchangeCodeForToken(settings, code);
  } catch (e) {
    console.error("m365 token exchange error:", e);
    return NextResponse.redirect(`${base}/login?error=token_exchange`);
  }

  let profile;
  try {
    profile = await getMe(tokens.access_token);
  } catch (e) {
    console.error("m365 graph /me error:", e);
    return NextResponse.redirect(`${base}/login?error=graph_failed`);
  }

  const email = normalizeEmail(profile.mail || profile.userPrincipalName || profile.email);
  if (!email) {
    return NextResponse.redirect(`${base}/login?error=no_email`);
  }

  const { dbGet, dbUpdate } = await import("@/lib/db/mysqlClient");
  let user: any = null;
  try {
    const rows = await dbGet("system_users", { email });
    user = rows[0];
  } catch (e) {
    console.error("m365 user lookup error:", e);
    return NextResponse.redirect(`${base}/login?error=internal`);
  }

  if (!user || user.is_active !== 1) {
    // No public registration: the email must already be provisioned by an admin.
    return NextResponse.redirect(`${base}/login?error=not_provisioned`);
  }
  if ((user.auth_type || "password").toLowerCase() === "password") {
    return NextResponse.redirect(`${base}/login?error=password_only`);
  }

  // Persist M365 tokens so mailbox/email data can be read later (Graph sync).
  const tokenRecord = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || null,
    id_token: tokens.id_token || null,
    expires_at: tokens.obtained_at + tokens.expires_in * 1000,
    scopes: tokens.scope || settings.scopes || "",
  };
  try {
    await dbUpdate("system_users", user.id, {
      azure_ad_id: profile.id || user.azure_ad_id,
      m365_token_json: tokenRecord,
      m365_mail_enabled: 1,
    });
  } catch (e) {
    console.error("m365 token persist error:", e);
  }

  const { signIn } = await import("@/lib/auth");
  try {
    await signIn("credentials", { type: "microsoft", email, redirectTo, redirect: false });
  } catch (e) {
    console.error("m365 session create error:", e);
    return NextResponse.redirect(`${base}/login?error=session`);
  }

  cookieJar.delete("m365_oauth_state");
  return NextResponse.redirect(`${base}${redirectTo}`);
}
