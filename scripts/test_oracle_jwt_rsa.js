const crypto = require('crypto');

console.log("=== Testing AES-256-GCM Encryption & Decryption ===");
const masterKeyEnv = process.env.ENCRYPTION_MASTER_KEY || "macro_workflow_system_secret_key_2026_32bytes!!";
const key = crypto.scryptSync(masterKeyEnv, "salt_workflow_engine_2026", 32);

function encryptSecret(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `AES256GCM:${iv.toString("hex")}:${encrypted}:${authTag}`;
}

function decryptSecret(encryptedPayload) {
  const parts = encryptedPayload.split(":");
  const iv = Buffer.from(parts[1], "hex");
  const encryptedText = parts[2];
  const authTag = Buffer.from(parts[3], "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const samplePrivateKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0TestPrivateKeyForOracleFusionIntegration...\n-----END RSA PRIVATE KEY-----";
const encrypted = encryptSecret(samplePrivateKey);
console.log("Encrypted payload:", encrypted.substring(0, 45) + "...");
const decrypted = decryptSecret(encrypted);
console.log("Decryption matched:", decrypted === samplePrivateKey ? "✅ YES" : "❌ NO");

console.log("\n=== Generating RSA 2048 Key Pair for JWT RS256 Signing Test ===");
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const header = { alg: "RS256", typ: "JWT", kid: "trustservice" };
const now = Math.floor(Date.now() / 1000);
const payload = {
  prn: "svc.inventory.api@macro-egy.com",
  iss: "www.oracle.com",
  iat: now,
  exp: now + 1800
};

const base64Url = (obj) =>
  Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const encodedHeader = base64Url(header);
const encodedPayload = base64Url(payload);
const tokenData = `${encodedHeader}.${encodedPayload}`;

const signer = crypto.createSign("RSA-SHA256");
signer.update(tokenData);
const signature = signer
  .sign(privateKey, "base64")
  .replace(/=/g, "")
  .replace(/\+/g, "-")
  .replace(/\//g, "_");

const jwtToken = `${tokenData}.${signature}`;
console.log("Generated Signed JWT RS256 Token:\n", jwtToken.substring(0, 80) + "...");

const verifier = crypto.createVerify("RSA-SHA256");
verifier.update(tokenData);
const sigBuffer = Buffer.from(signature.replace(/-/g, "+").replace(/_/g, "/"), "base64");
const isValid = verifier.verify(publicKey, sigBuffer);
console.log("Signature verification result:", isValid ? "✅ VALID RS256 JWT" : "❌ INVALID");
