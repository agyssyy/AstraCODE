import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { env } from "../env.js";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const n = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = Buffer.from(parts[4] ?? "", "base64");
    const expected = Buffer.from(parts[5] ?? "", "base64");
    if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
    const derived = scryptSync(password, salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", env.encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(payload: string | null): string | null {
  if (!payload) return null;
  try {
    const [version, ivB64, tagB64, dataB64] = payload.split(".");
    if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      env.encryptionKey,
      Buffer.from(ivB64, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

export function keyHint(payload: string | null): string | null {
  const key = decryptSecret(payload);
  if (!key) return null;
  if (key.length <= 4) return "••••";
  return `•••• ${key.slice(-4)}`;
}

export function signPreviewToken(projectId: string, ttlSeconds = 3600): string {
  const expires = Date.now() + ttlSeconds * 1000;
  const payload = `${projectId}.${expires}`;
  const signature = createHmac("sha256", env.previewSecret).update(payload).digest("base64url");
  return Buffer.from(`${expires}.${signature}`).toString("base64url");
}

export function verifyPreviewToken(projectId: string, token: string): boolean {
  try {
    const canonical = Buffer.from(token, "base64url");
    if (canonical.length === 0 || canonical.toString("base64url") !== token) return false;
    const decoded = canonical.toString("utf8");
    const [expiresRaw, signature] = decoded.split(".");
    const expires = Number(expiresRaw);
    if (!Number.isFinite(expires) || expires < Date.now()) return false;
    if (!signature) return false;
    const expected = createHmac("sha256", env.previewSecret)
      .update(`${projectId}.${expires}`)
      .digest("base64url");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function maskHeaderValue(key: string, value: string): string {
  const sensitive = /authorization|api[-_]?key|token|secret|password|cookie/i.test(key);
  if (!sensitive) return value;
  if (value.length <= 8) return "••••";
  return `••••${value.slice(-4)}`;
}
