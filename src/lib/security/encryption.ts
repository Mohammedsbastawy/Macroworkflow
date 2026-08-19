import crypto from "crypto";

const MASTER_KEY_ENV = process.env.ENCRYPTION_MASTER_KEY || "macro_workflow_system_secret_key_2026_32bytes!!";

function getDerivedKey(): Buffer {
  return crypto.scryptSync(MASTER_KEY_ENV, "salt_workflow_engine_2026", 32);
}

/**
 * Encrypts a plain text string using AES-256-GCM
 * Format: "AES256GCM:<iv_hex>:<cipher_hex>:<tag_hex>"
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return "";
  if (plainText.startsWith("AES256GCM:")) return plainText; // already encrypted

  const key = getDerivedKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `AES256GCM:${iv.toString("hex")}:${encrypted}:${authTag}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload string
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload) return "";
  if (!encryptedPayload.startsWith("AES256GCM:")) {
    // Return as-is if not encrypted with this format
    return encryptedPayload;
  }

  try {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 4) return encryptedPayload;

    const iv = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];
    const authTag = Buffer.from(parts[3], "hex");
    const key = getDerivedKey();

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("Failed to decrypt secret:", err);
    return encryptedPayload;
  }
}
