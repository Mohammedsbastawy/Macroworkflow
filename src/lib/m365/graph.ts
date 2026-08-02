import * as jose from "jose";
import type { EntraSettings } from "./settings";
import { ENTRA_DEFAULT_SCOPES, ENTRA_MAILBOX_STATIC_SCOPES, getRedirectUri } from "./settings";

export interface M365TokenSet {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  scope?: string;
  obtained_at: number; // epoch ms
}

export interface M365Profile {
  id: string;
  displayName?: string;
  email?: string;
  userPrincipalName?: string;
  jobTitle?: string;
  mail?: string;
}

function authority(settings: EntraSettings): string {
  const tenant = settings.tenantId || "common";
  return `https://login.microsoftonline.com/${tenant}`;
}

/**
 * Build the Entra ID authorization URL (OAuth2 auth-code flow).
 */
export async function buildAuthorizeUrl(
  settings: EntraSettings,
  state: string,
): Promise<string> {
  const redirectUri = await getRedirectUri(settings);
  const scopes = settings.scopes || ENTRA_DEFAULT_SCOPES;
  const params = new URLSearchParams({
    client_id: settings.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: scopes,
    state,
    response_type_hint: "id_token",
    prompt: "select_account",
  });
  return `${authority(settings)}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForToken(
  settings: EntraSettings,
  code: string,
): Promise<M365TokenSet> {
  const redirectUri = await getRedirectUri(settings);
  const body = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: settings.scopes || ENTRA_DEFAULT_SCOPES,
  });
  const res = await fetch(`${authority(settings)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return { ...json, obtained_at: Date.now() };
}

/**
 * Refresh an expired access token.
 */
export async function refreshAccessToken(
  settings: EntraSettings,
  refreshToken: string,
): Promise<M365TokenSet> {
  const body = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: settings.scopes || ENTRA_DEFAULT_SCOPES,
  });
  const res = await fetch(`${authority(settings)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return { ...json, obtained_at: Date.now() };
}

/**
 * Fetch the signed-in profile from Microsoft Graph.
 */
export async function getMe(accessToken: string): Promise<M365Profile> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Graph /me failed (${res.status})`);
  }
  return res.json();
}

/**
 * Verify the ID token signature/claims against the tenant JWKS.
 * Returns true when the token is valid for this tenant + client.
 */
export async function verifyIdToken(
  settings: EntraSettings,
  idToken: string,
): Promise<boolean> {
  try {
    const tenant = settings.tenantId || "common";
    const issuer = `https://login.microsoftonline.com/${tenant}/v2.0`;
    const jwks = jose.createRemoteJWKSet(
      new URL(`${authority(settings)}/discovery/v2.0/keys`),
    );
    const { payload } = await jose.jwtVerify(idToken, jwks, {
      issuer,
      audience: settings.clientId,
    });
    return payload && typeof payload === "object";
  } catch (e) {
    console.error("ID token verification failed:", e);
    return false;
  }
}

export function isTokenExpired(token: M365TokenSet, skewMs = 60_000): boolean {
  return token.obtained_at + token.expires_in * 1000 - skewMs < Date.now();
}

export function normalizeEmail(email?: string): string {
  return (email || "").trim().toLowerCase();
}

/**
 * Obtain an app-only (client-credentials) access token for the CENTRALIZED
 * system sender mailbox. This never touches individual employee mailboxes —
 * it is used only to send/poll mail from the single configured sender address.
 */
export async function getMailboxAccessToken(
  settings: EntraSettings,
): Promise<M365TokenSet> {
  const body = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    scope: ENTRA_MAILBOX_STATIC_SCOPES,
    grant_type: "client_credentials",
  });
  const res = await fetch(`${authority(settings)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Mailbox token exchange failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return { ...json, obtained_at: Date.now() };
}

export interface MailboxMessage {
  subject: string;
  body: string;
  toRecipients: string[];
  isHtml?: boolean;
}

/**
 * Send an email FROM the centralized system sender mailbox using the
 * app-only token. The sender address must have send permission granted
 * (e.g. a licensed mailbox or an allowed send-as on the shared mailbox).
 */
export async function sendMailboxMessage(
  settings: EntraSettings,
  token: string,
  message: MailboxMessage,
): Promise<void> {
  if (!settings.senderEmail) {
    throw new Error("System sender email is not configured.");
  }
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(settings.senderEmail)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: message.subject,
          body: {
            contentType: message.isHtml ? "HTML" : "Text",
            content: message.body,
          },
          toRecipients: message.toRecipients.map((email) => ({
            emailAddress: { address: email },
          })),
        },
        saveToSentItems: false,
      }),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Mail send failed (${res.status}): ${err}`);
  }
}
