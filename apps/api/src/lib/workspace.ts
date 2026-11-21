import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { projectFiles } from "@astracode/database";
import type { Database } from "@astracode/database";
import { env } from "../env.js";
import { badRequest } from "./errors.js";

export const workspacesRoot = path.join(env.dataDir, "workspaces");

export function workspaceDir(projectId: string): string {
  if (!/^[a-f0-9-]{36}$/i.test(projectId)) {
    throw badRequest("Invalid project id");
  }
  return path.join(workspacesRoot, projectId);
}

async function writeOne(base: string, relative: string, content: string): Promise<void> {
  const target = path.resolve(base, relative);
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw badRequest("File path escapes the workspace");
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

export async function syncProjectToDisk(
  projectId: string,
  files: { path: string; content: string }[],
): Promise<void> {
  const base = workspaceDir(projectId);
  await fs.mkdir(base, { recursive: true });
  for (const file of files) {
    await writeOne(base, file.path, file.content);
  }
}

export async function writeProjectFile(
  projectId: string,
  relative: string,
  content: string,
): Promise<void> {
  const base = workspaceDir(projectId);
  await fs.mkdir(base, { recursive: true });
  await writeOne(base, relative, content);
}

export async function deleteProjectFile(projectId: string, relative: string): Promise<void> {
  const base = workspaceDir(projectId);
  const target = path.resolve(base, relative);
  if (!target.startsWith(base + path.sep)) {
    throw badRequest("File path escapes the workspace");
  }
  try {
    await fs.unlink(target);
  } catch {
    return;
  }
  let dir = path.dirname(target);
  while (dir.startsWith(base + path.sep)) {
    try {
      await fs.rmdir(dir);
    } catch {
      break;
    }
    dir = path.dirname(dir);
  }
}

export async function renameProjectFile(
  projectId: string,
  from: string,
  to: string,
): Promise<void> {
  const base = workspaceDir(projectId);
  const source = path.resolve(base, from);
  const target = path.resolve(base, to);
  if (!source.startsWith(base + path.sep) || !target.startsWith(base + path.sep)) {
    throw badRequest("File path escapes the workspace");
  }
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.rename(source, target);
  } catch {
    return;
  }
}

export async function ensureWorkspace(projectId: string, db: Database): Promise<string> {
  const dir = workspaceDir(projectId);
  const exists = fsSync.existsSync(dir);
  if (!exists) {
    const files = await db
      .select({ path: projectFiles.path, content: projectFiles.content })
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId));
    await syncProjectToDisk(projectId, files);
  }
  return dir;
}

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  py: "text/plain; charset=utf-8",
  wasm: "application/wasm",
  woff2: "font/woff2",
};

export function contentTypeFor(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

export async function resolvePreviewFile(
  projectId: string,
  relative: string,
): Promise<{ absolute: string; relative: string } | null> {
  const base = workspaceDir(projectId);
  const clean = relative.replace(/^\/+/, "").replace(/\\/g, "/");
  if (clean.includes("\0")) return null;
  let target = path.resolve(base, clean || "index.html");
  if (target !== base && !target.startsWith(base + path.sep)) return null;
  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) {
      target = path.join(target, "index.html");
    }
    const resolved = await fs.realpath(target);
    const realBase = await fs.realpath(base);
    if (!resolved.startsWith(realBase + path.sep) && resolved !== realBase) return null;
    await fs.access(resolved);
    return { absolute: resolved, relative: path.relative(realBase, resolved) };
  } catch {
    return null;
  }
}
