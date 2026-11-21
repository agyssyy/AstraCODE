export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function titleFromMessage(message: string): string {
  const line = message.trim().split("\n")[0]?.replace(/\s+/g, " ") ?? "New conversation";
  return line.length > 72 ? `${line.slice(0, 69)}…` : line || "New conversation";
}

const SEGMENT_RE = /^[A-Za-z0-9._@+()\[\] -]+$/;

export function isValidFilePath(path: string): boolean {
  if (typeof path !== "string" || path.length === 0 || path.length > 240) return false;
  if (path.startsWith("/") || path.includes("\\") || path.includes("\0")) return false;
  const segments = path.split("/");
  if (segments.some((s) => s.length === 0 || s.length > 100)) return false;
  if (segments.some((s) => s === "." || s === "..")) return false;
  if (segments.some((s) => !SEGMENT_RE.test(s))) return false;
  return true;
}

export function normalizeFilePath(path: string): string {
  return path.replace(/^\.\//, "").replace(/\/+/g, "/").trim();
}

export function assertValidFilePath(path: string): string {
  const normalized = normalizeFilePath(path);
  if (!isValidFilePath(normalized)) {
    throw new Error(
      "Invalid file path. Use relative paths without '..', backslashes or special characters.",
    );
  }
  return normalized;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function languageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    sh: "shell",
    yml: "yaml",
    yaml: "yaml",
    sql: "sql",
    toml: "ini",
    txt: "plaintext",
  };
  return map[ext] ?? "plaintext";
}
