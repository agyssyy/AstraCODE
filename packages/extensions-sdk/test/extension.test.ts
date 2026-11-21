import { describe, expect, it } from "vitest";
import { defineExtension, validateExtension, type ExtensionDefinition } from "../src";

const base: ExtensionDefinition = {
  id: "my-extension",
  name: "My extension",
  description: "Adds a review prompt and a tiny template.",
  category: "Prompt Packs",
  version: "1.0.0",
  author: "AstraCode Labs",
  permissions: ["chat:presets"],
  manifest: {
    prompts: [
      {
        id: "review",
        title: "Review",
        description: "Review my code",
        prompt: "Review this code for correctness and clarity. Explain each finding.",
      },
    ],
  },
};

const clone = (): ExtensionDefinition => structuredClone(base);

describe("validateExtension", () => {
  it("accepts a valid definition", () => {
    const result = validateExtension(base);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.extension.id).toBe("my-extension");
      expect(result.extension.permissions).toEqual(["chat:presets"]);
    }
  });

  it("rejects bad ids and versions", () => {
    const bad = validateExtension({ ...clone(), id: "Bad Id", version: "1.0" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors.join(" ")).toMatch(/id must/);
      expect(bad.errors.join(" ")).toMatch(/semantic versioning/);
    }
  });

  it("rejects unknown or duplicate permissions", () => {
    const result = validateExtension({
      ...clone(),
      permissions: ["chat:presets", "root:everything", "chat:presets"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.includes("unknown permission"))).toBe(true);
      expect(result.errors.some((error) => error.includes("duplicate permission"))).toBe(true);
    }
  });

  it("rejects traversal in template paths", () => {
    const result = validateExtension({
      ...clone(),
      manifest: {
        templates: [
          {
            id: "starter",
            name: "Starter",
            description: "A template",
            language: "typescript",
            files: [{ path: "../secret.ts", content: "x" }],
          },
        ],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/\.\.|relative POSIX path/);
  });

  it("requires at least one template or prompt", () => {
    const result = validateExtension({ ...clone(), manifest: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/templates and\/or prompts/);
  });

  it("only allows http(s) links", () => {
    const result = validateExtension({ ...clone(), repoUrl: "ftp://example.com/repo" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/http\(s\)/);
  });
});

describe("defineExtension", () => {
  it("freezes valid definitions", () => {
    const extension = defineExtension(base);
    expect(Object.isFrozen(extension)).toBe(true);
  });

  it("throws with each validation error", () => {
    expect(() => defineExtension({ ...clone(), name: "" })).toThrow(/name must/);
  });
});
