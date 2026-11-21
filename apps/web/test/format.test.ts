import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatLatency,
  formatNumber,
  initials,
  relativeDay,
  timeAgo,
} from "../src/lib/format";

const ago = (seconds: number) => new Date(Date.now() - seconds * 1000);

describe("timeAgo", () => {
  it("handles recent and distant times", () => {
    expect(timeAgo(ago(5))).toBe("just now");
    expect(timeAgo(ago(90))).toBe("2m ago");
    expect(timeAgo(ago(3 * 3600))).toBe("3h ago");
    expect(timeAgo(ago(5 * 86_400))).toBe("5d ago");
  });

  it("falls back to a date for older values", () => {
    expect(timeAgo(ago(60 * 86_400))).not.toMatch(/ago/);
  });

  it("returns empty for invalid input", () => {
    expect(timeAgo("not-a-date")).toBe("");
  });
});

describe("relativeDay", () => {
  it("labels today and yesterday", () => {
    expect(relativeDay(new Date().toISOString())).toBe("Today");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(relativeDay(yesterday.toISOString())).toBe("Yesterday");
  });
});

describe("small formatters", () => {
  it("formats latency", () => {
    expect(formatLatency(null)).toBe("—");
    expect(formatLatency(250)).toBe("250 ms");
    expect(formatLatency(1500)).toBe("1.5 s");
  });

  it("formats bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });

  it("builds initials", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("  grace   brewster hopper ")).toBe("GB");
    expect(initials("")).toBe("");
  });

  it("formats numbers", () => {
    expect(formatNumber(1000)).not.toBe("1000");
  });
});
