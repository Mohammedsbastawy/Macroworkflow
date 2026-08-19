import { decryptSecret } from "@/lib/security/encryption";
import crypto from "crypto";

export interface IntegrationConfig {
  base_url?: string;
  prn_username?: string;
  key_id?: string;
  private_key?: string;
  token_expiry_minutes?: number;
  issuer?: string;
  audience?: string;
  username?: string;
  password?: string;
  bearer_token?: string;
  [key: string]: any;
}

export interface AuthStrategy {
  getAuthHeader(config: IntegrationConfig): Promise<Record<string, string>>;
}

/**
 * Strategy 1: JWT RS256 for Oracle Fusion Cloud SCM
 */
export class JwtRs256AuthStrategy implements AuthStrategy {
  async getAuthHeader(config: IntegrationConfig): Promise<Record<string, string>> {
    // Fallback: if no private_key but username+password exist, use Basic Auth
    const rawPrivateKey = config.private_key || "";
    const username = (config.prn_username || config.username || "").trim();
    const rawPassword = config.password || "";

    if (!rawPrivateKey && username && rawPassword) {
      console.log("[AuthStrategy] No private_key found, falling back to Basic Auth");
      const password = decryptSecret(rawPassword);
      const credentials = Buffer.from(`${username}:${password}`).toString("base64");
      return { Authorization: `Basic ${credentials}` };
    }

    const prn = username;
    const keyId = (config.key_id || "").trim();
    const expiryMinutes = Number(config.token_expiry_minutes) || 30;
    const issuer = (config.issuer || "workflow_issuer").trim();

    if (!rawPrivateKey) {
      throw new Error("JwtRs256AuthStrategy: Private key is missing in config.");
    }

    // Decrypt private key if encrypted
    const privateKeyPem = decryptSecret(rawPrivateKey).trim();

    // Build JWT RS256 token payload
    const payload: any = {
      prn,
      sub: prn,
      iss: issuer,
    };

    if (config.audience && config.audience.trim()) {
      payload.aud = config.audience.trim();
    }

    // Build JWT RS256 token
    const token = this.generateSignedJwt(privateKeyPem, payload, keyId, expiryMinutes);

    return {
      Authorization: `Bearer ${token}`
    };
  }

  private generateSignedJwt(
    privateKeyPem: string,
    payload: Record<string, any>,
    keyId: string,
    expiryMinutes: number
  ): string {
    const header = {
      alg: "RS256",
      typ: "JWT",
      ...(keyId ? { kid: keyId } : {})
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      ...payload,
      iat: now,
      exp: now + expiryMinutes * 60
    };

    const base64Url = (obj: any) =>
      Buffer.from(JSON.stringify(obj))
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");

    const encodedHeader = base64Url(header);
    const encodedPayload = base64Url(jwtPayload);
    const tokenData = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign("RSA-SHA256");
    signer.update(tokenData);
    const signature = signer
      .sign(privateKeyPem, "base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    return `${tokenData}.${signature}`;
  }
}

/**
 * Strategy 2: Basic Authentication (Username + Password)
 */
export class BasicAuthStrategy implements AuthStrategy {
  async getAuthHeader(config: IntegrationConfig): Promise<Record<string, string>> {
    const username = (config.username || "").trim();
    const rawPassword = config.password || "";
    const password = decryptSecret(rawPassword);
    const credentials = Buffer.from(`${username}:${password}`).toString("base64");
    return {
      Authorization: `Basic ${credentials}`
    };
  }
}

/**
 * Strategy 3: Bearer Token / API Key
 */
export class BearerTokenStrategy implements AuthStrategy {
  async getAuthHeader(config: IntegrationConfig): Promise<Record<string, string>> {
    const rawToken = config.bearer_token || "";
    const token = decryptSecret(rawToken).trim();
    return {
      Authorization: `Bearer ${token}`
    };
  }
}

/**
 * Factory to get appropriate auth strategy by auth_type
 */
export function getAuthStrategy(authType: string): AuthStrategy {
  switch (authType) {
    case "jwt_rs256":
      return new JwtRs256AuthStrategy();
    case "basic":
      return new BasicAuthStrategy();
    case "bearer":
      return new BearerTokenStrategy();
    default:
      return new JwtRs256AuthStrategy();
  }
}
