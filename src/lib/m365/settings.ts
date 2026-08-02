import { getSystemSettings, setSystemSetting } from "@/lib/db/systemSettings";

export interface EntraSettings {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  scopes?: string;
  enabled: boolean;
  senderEmail?: string;
  senderName?: string;
  mailEnabled: boolean;
}

/**
 * Scopes requested during employee sign-in. Intentionally PROFILE-ONLY — no
 * Mail.Read/Mail.ReadWrite for individual employee mailboxes. The only mailbox
 * integration is the single, centralized system sender (app-only, configured
 * in admin settings and accessed via client-credentials — see ENTRA_MAILBOX_SCOPES).
 */
export const ENTRA_DEFAULT_SCOPES = "openid profile email offline_access User.Read";

/**
 * Application (app-only) permissions used to access ONLY the centralized
 * system sender mailbox for automated send/poll. Never granted to individual
 * employee sessions.
 */
export const ENTRA_MAILBOX_STATIC_SCOPES = [
  "https://graph.microsoft.com/Mail.Send",
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/Mail.ReadWrite",
].join(" ");

export const ENTRA_SETTING_KEYS = [
  "AAD_TENANT_ID",
  "AAD_CLIENT_ID",
  "AAD_CLIENT_SECRET",
  "AAD_REDIRECT_URI",
  "AAD_SCOPES",
  "AAD_ENABLED",
  "AAD_SYSTEM_SENDER_EMAIL",
  "AAD_SYSTEM_SENDER_NAME",
  "AAD_MAIL_ENABLED",
] as const;

export type EntraSettingKey = (typeof ENTRA_SETTING_KEYS)[number];

/**
 * Load the Microsoft Entra ID integration settings directly from the database
 * (dynamic — updated from the admin Settings page, not env files).
 */
export async function loadEntraSettings(): Promise<EntraSettings> {
  const map = await getSystemSettings([...ENTRA_SETTING_KEYS] as string[]);
  return {
    tenantId: (map["AAD_TENANT_ID"] || "").trim(),
    clientId: (map["AAD_CLIENT_ID"] || "").trim(),
    clientSecret: (map["AAD_CLIENT_SECRET"] || "").trim(),
    redirectUri: (map["AAD_REDIRECT_URI"] || "").trim() || undefined,
    scopes: (map["AAD_SCOPES"] || "").trim() || undefined,
    enabled: (map["AAD_ENABLED"] || "false") === "true",
    senderEmail: (map["AAD_SYSTEM_SENDER_EMAIL"] || "").trim() || undefined,
    senderName: (map["AAD_SYSTEM_SENDER_NAME"] || "").trim() || undefined,
    mailEnabled: (map["AAD_MAIL_ENABLED"] || "false") === "true",
  };
}

export async function saveEntraSettings(input: Partial<EntraSettings>): Promise<void> {
  const defs: Record<string, string> = {
    AAD_TENANT_ID: "Microsoft Entra ID (Azure AD) Directory (Tenant) ID",
    AAD_CLIENT_ID: "Microsoft Entra ID Application (Client) ID",
    AAD_CLIENT_SECRET: "Microsoft Entra ID App Client Secret value",
    AAD_REDIRECT_URI: "OAuth2 redirect URI (must match Azure app registration)",
    AAD_SCOPES: "Microsoft Graph delegated permission scopes",
    AAD_ENABLED: "Enable Sign in with Microsoft 365",
    AAD_SYSTEM_SENDER_EMAIL: "Official system sender mailbox address (From: address for automated emails)",
    AAD_SYSTEM_SENDER_NAME: "Official system sender display name",
    AAD_MAIL_ENABLED: "Enable Microsoft 365 mailbox integrations (send/poll automated email & mail sync)",
  };

  const updates: Array<[string, string | undefined]> = [
    ["AAD_TENANT_ID", input.tenantId?.trim()],
    ["AAD_CLIENT_ID", input.clientId?.trim()],
    ["AAD_CLIENT_SECRET", input.clientSecret?.trim()],
    ["AAD_REDIRECT_URI", input.redirectUri?.trim()],
    ["AAD_SCOPES", input.scopes?.trim() || ENTRA_DEFAULT_SCOPES],
    ["AAD_ENABLED", input.enabled !== undefined ? String(input.enabled) : undefined],
    ["AAD_SYSTEM_SENDER_EMAIL", input.senderEmail?.trim()],
    ["AAD_SYSTEM_SENDER_NAME", input.senderName?.trim()],
    ["AAD_MAIL_ENABLED", input.mailEnabled !== undefined ? String(input.mailEnabled) : undefined],
  ];

  for (const [key, value] of updates) {
    if (value === undefined || value === null) continue;
    await setSystemSetting(key, value, defs[key]);
  }
}

/**
 * Build the redirect URI registered in the Azure app. Falls back to
 * NEXT_PUBLIC_APP_URL + /api/auth/microsoft/callback when not configured.
 */
export async function getRedirectUri(settings: EntraSettings): Promise<string> {
  if (settings.redirectUri) return settings.redirectUri;
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") || "http://localhost:3000";
  return `${base}/api/auth/microsoft/callback`;
}
