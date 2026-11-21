import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  hashPassword,
  keyHint,
  maskHeaderValue,
  randomToken,
  sha256,
  signPreviewToken,
  verifyPassword,
  verifyPreviewToken,
} from "../src/lib/crypto";

describe("password hashing", () => {
  it("verifies the correct password and rejects others", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(verifyPassword("wrong password", hash)).toBe(false);
  });

  it("produces unique salts", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("rejects malformed hashes", () => {
    expect(verifyPassword("x", "not-a-hash")).toBe(false);
  });
});

describe("secret encryption", () => {
  it("round-trips and never stores plaintext", () => {
    const secret = "sk-test-1234567890";
    const payload = encryptSecret(secret);
    expect(payload).not.toContain(secret);
    expect(decryptSecret(payload)).toBe(secret);
    expect(keyHint(payload)).toBe("•••• 7890");
  });

  it("rejects tampered payloads", () => {
    const payload = encryptSecret("secret");
    const parts = payload.split(".");
    const tampered = [...parts];
    tampered[3] = tampered[3]!.slice(0, -2) + "AA";
    expect(decryptSecret(tampered.join("."))).not.toBe("secret");
    expect(decryptSecret("garbage")).toBeNull();
    expect(decryptSecret(null)).toBeNull();
  });
});

describe("tokens", () => {
  it("generates unique url-safe tokens", () => {
    const token = randomToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).not.toBe(randomToken());
    expect(sha256(token)).toHaveLength(64);
  });

  it("signs preview URLs bound to the project", () => {
    const token = signPreviewToken("project-1", 60);
    expect(verifyPreviewToken("project-1", token)).toBe(true);
    expect(verifyPreviewToken("project-2", token)).toBe(false);
    expect(verifyPreviewToken("project-1", `${token}x`)).toBe(false);
  });

  it("expires preview tokens", () => {
    const token = signPreviewToken("project-1", -5);
    expect(verifyPreviewToken("project-1", token)).toBe(false);
  });
});

describe("header masking", () => {
  it("masks secrets only", () => {
    expect(maskHeaderValue("Authorization", "Bearer supersecret")).toBe("••••cret");
    expect(maskHeaderValue("X-Api-Key", "short")).toBe("••••");
    expect(maskHeaderValue("Accept", "application/json")).toBe("application/json");
  });
});
