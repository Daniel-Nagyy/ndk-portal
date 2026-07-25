// crypto.mjs — AES-256-GCM encryption for account credentials at rest.
import crypto from "node:crypto";
import dotenv from "dotenv";
dotenv.config();

function loadKey() {
  const raw = process.env.APP_ENCRYPTION_KEY || "";
  if (!raw) {
    console.warn("APP_ENCRYPTION_KEY not set — account credential encryption is INSECURE.");
    // Deterministic fallback so the app still runs in dev; NOT for production.
    return crypto.createHash("sha256").update("ndk-dev-fallback-key").digest();
  }
  // Accept base64 or hex; must decode to 32 bytes.
  let key = Buffer.from(raw, "base64");
  if (key.length !== 32) key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be 32 bytes (base64 or hex).");
  }
  return key;
}

const KEY = loadKey();

// Returns "iv:tag:ciphertext" (all base64). Safe to store in the DB.
export function encrypt(plaintext) {
  if (plaintext == null || plaintext === "") return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decrypt(payload) {
  if (!payload) return "";
  const parts = String(payload).split(":");
  if (parts.length !== 3) return "";
  try {
    const [ivB64, tagB64, dataB64] = parts;
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch (error) {
    console.warn("Credential decrypt failed:", error.message || error);
    return "";
  }
}
