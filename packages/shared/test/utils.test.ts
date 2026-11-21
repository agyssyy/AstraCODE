import { describe, expect, it } from "vitest";
import {
  assertValidFilePath,
  estimateTokens,
  formatBytes,
  isValidFilePath,
  languageFromPath,
  normalizeFilePath,
  titleFromMessage,
  truncate,
} from "../src/utils";
import { benchmarkSuites } from "../src/benchmarks";
import { chatSchema, fileWriteSchema, providerCreateSchema } from "../src/validation";

describe("estimateTokens", () => {
  it("never returns zero", () => {
    expect(estimateTokens("")).toBe(1);
    expect(estimateTokens("abc")).toBe(1);
  });

  it("scales roughly with length", () => {
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });
});

describe("titleFromMessage", () => {
  it("uses the first line", () => {
    expect(titleFromMessage("Fix the bug\nmore detail")).toBe("Fix the bug");
  });

  it("collapses whitespace and truncates", () => {
    const title = titleFromMessage("  hello    world  ");
    expect(title).toBe("hello world");
    const long = titleFromMessage("x".repeat(100));
    expect(long.length).toBe(70);
    expect(long.endsWith("…")).toBe(true);
  });

  it("falls back for empty input", () => {
    expect(titleFromMessage("   ")).toBe("New conversation");
  });
});

describe("file paths", () => {
  it("accepts normal relative paths", () => {
    for (const path of ["index.ts", "src/app/page.tsx", "a/b/c_test.py", ".env.example", "my file.md"]) {
      expect(isValidFilePath(path), path).toBe(true);
    }
  });

  it("rejects traversal and malformed paths", () => {
    for (const path of [
      "",
      "/etc/passwd",
      "../secret",
      "src/../secret",
      "src\\app.ts",
      "a//b",
      "src/",
      "bad\u0000name",
      "x".repeat(241),
    ]) {
      expect(isValidFilePath(path), path).toBe(false);
    }
  });

  it("normalizes and throws on invalid input", () => {
    expect(normalizeFilePath("./src//app.ts")).toBe("src/app.ts");
    expect(assertValidFilePath("./src/index.ts")).toBe("src/index.ts");
    expect(() => assertValidFilePath("../nope")).toThrow(/Invalid file path/);
  });
});

describe("formatting helpers", () => {
  it("formats bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(-1)).toBe("—");
  });

  it("truncates long values", () => {
    expect(truncate("abcdef", 3)).toBe("abc…");
    expect(truncate("abc", 10)).toBe("abc");
  });

  it("maps extensions to languages", () => {
    expect(languageFromPath("src/x.tsx")).toBe("typescript");
    expect(languageFromPath("README.md")).toBe("markdown");
    expect(languageFromPath("file.unknown")).toBe("plaintext");
  });
});

describe("benchmark suites", () => {
  it("have unique suite and prompt ids", () => {
    const suiteIds = new Set<string>();
    const promptIds = new Set<string>();
    for (const suite of benchmarkSuites) {
      expect(suiteIds.has(suite.id)).toBe(false);
      suiteIds.add(suite.id);
      expect(suite.prompts.length).toBeGreaterThan(0);
      for (const prompt of suite.prompts) {
        expect(promptIds.has(prompt.id)).toBe(false);
        promptIds.add(prompt.id);
        expect(prompt.prompt.length).toBeGreaterThan(20);
      }
    }
    expect(benchmarkSuites.length).toBeGreaterThanOrEqual(3);
  });
});

describe("validation schemas", () => {
  it("rejects empty chat messages", () => {
    const result = chatSchema.safeParse({ message: "  ", modelId: "00000000-0000-0000-0000-000000000000" });
    expect(result.success).toBe(false);
  });

  it("rejects traversal in file paths", () => {
    expect(fileWriteSchema.safeParse({ path: "../x", content: "" }).success).toBe(false);
    expect(fileWriteSchema.safeParse({ path: "src/index.ts", content: "" }).success).toBe(true);
  });

  it("requires http(s) provider URLs", () => {
    expect(
      providerCreateSchema.safeParse({ name: "x", kind: "custom", baseUrl: "ftp://example.com" }).success,
    ).toBe(false);
  });
});
