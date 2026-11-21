import {
  extensionPermissions,
  type ExtensionDefinition,
  type ExtensionFile,
  type ExtensionManifest,
  type ExtensionPermission,
  type ExtensionPrompt,
  type ExtensionTemplate,
  type ValidationResult,
} from "./types.js";

const ID_RE = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const PATH_RE = /^[A-Za-z0-9._@+()\[\] -]+(?:\/[A-Za-z0-9._@+()\[\] -]+)*$/;
const MAX_FILES = 50;
const MAX_FILE_BYTES = 300_000;
const MAX_TEMPLATES = 20;
const MAX_PROMPTS = 50;
const permissionSet = new Set<string>(extensionPermissions);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(
  value: unknown,
  field: string,
  max: number,
  errors: string[],
  { optional = false } = {},
): value is string {
  if (value === undefined && optional) return true;
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${field} must be a non-empty string`);
    return false;
  }
  if (value.length > max) {
    errors.push(`${field} must be at most ${max} characters`);
    return false;
  }
  return true;
}

function safeFilePath(path: unknown, field: string, errors: string[]): path is string {
  if (typeof path !== "string" || path.length === 0 || path.length > 240) {
    errors.push(`${field} must be a relative path under 240 characters`);
    return false;
  }
  if (path.startsWith("/") || path.startsWith("./") || path.includes("\\") || path.includes("\0")) {
    errors.push(`${field} must be a clean relative POSIX path`);
    return false;
  }
  if (path.split("/").some((segment) => segment === "." || segment === ".." || segment === "")) {
    errors.push(`${field} must not contain empty, "." or ".." segments`);
    return false;
  }
  if (!PATH_RE.test(path)) {
    errors.push(`${field} contains unsupported characters`);
    return false;
  }
  return true;
}

function validateFiles(raw: unknown, field: string, errors: string[]): ExtensionFile[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_FILES) {
    errors.push(`${field} must contain 1-${MAX_FILES} files`);
    return null;
  }
  const seen = new Set<string>();
  const files: ExtensionFile[] = [];
  raw.forEach((entry, index) => {
    const label = `${field}[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!safeFilePath(entry.path, `${label}.path`, errors)) return;
    if (typeof entry.content !== "string") {
      errors.push(`${label}.content must be a string`);
      return;
    }
    if (new TextEncoder().encode(entry.content).length > MAX_FILE_BYTES) {
      errors.push(`${label}.content exceeds ${MAX_FILE_BYTES} bytes`);
      return;
    }
    if (seen.has(entry.path)) {
      errors.push(`${field} has duplicate path "${entry.path}"`);
      return;
    }
    seen.add(entry.path);
    files.push({ path: entry.path, content: entry.content });
  });
  return files;
}

function validateTemplates(raw: unknown, errors: string[]): ExtensionTemplate[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > MAX_TEMPLATES) {
    errors.push(`manifest.templates must be an array of at most ${MAX_TEMPLATES} templates`);
    return [];
  }
  const templates: ExtensionTemplate[] = [];
  const ids = new Set<string>();
  raw.forEach((entry, index) => {
    const label = `manifest.templates[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${label} must be an object`);
      return;
    }
    const validId = stringField(entry.id, `${label}.id`, 63, errors) && ID_RE.test(entry.id as string);
    if (typeof entry.id === "string" && !ID_RE.test(entry.id)) {
      errors.push(`${label}.id must be kebab-case`);
    }
    stringField(entry.name, `${label}.name`, 120, errors);
    stringField(entry.description, `${label}.description`, 500, errors);
    stringField(entry.language, `${label}.language`, 40, errors);
    if (validId && typeof entry.id === "string") {
      if (ids.has(entry.id)) errors.push(`manifest.templates has duplicate id "${entry.id}"`);
      ids.add(entry.id);
    }
    const files = validateFiles(entry.files, `${label}.files`, errors);
    if (validId && files) {
      templates.push({
        id: entry.id as string,
        name: entry.name as string,
        description: entry.description as string,
        language: entry.language as string,
        files,
      });
    }
  });
  return templates;
}

function validatePrompts(raw: unknown, errors: string[]): ExtensionPrompt[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > MAX_PROMPTS) {
    errors.push(`manifest.prompts must be an array of at most ${MAX_PROMPTS} prompts`);
    return [];
  }
  const prompts: ExtensionPrompt[] = [];
  const ids = new Set<string>();
  raw.forEach((entry, index) => {
    const label = `manifest.prompts[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${label} must be an object`);
      return;
    }
    const validId = stringField(entry.id, `${label}.id`, 63, errors) && ID_RE.test(entry.id as string);
    if (typeof entry.id === "string" && !ID_RE.test(entry.id)) {
      errors.push(`${label}.id must be kebab-case`);
    }
    stringField(entry.title, `${label}.title`, 120, errors);
    stringField(entry.description, `${label}.description`, 500, errors);
    stringField(entry.prompt, `${label}.prompt`, 20_000, errors);
    if (validId && typeof entry.id === "string") {
      if (ids.has(entry.id)) errors.push(`manifest.prompts has duplicate id "${entry.id}"`);
      ids.add(entry.id);
    }
    if (validId) {
      prompts.push({
        id: entry.id as string,
        title: entry.title as string,
        description: entry.description as string,
        prompt: entry.prompt as string,
      });
    }
  });
  return prompts;
}

function validateManifest(raw: unknown, errors: string[]): ExtensionManifest | null {
  if (!isRecord(raw)) {
    errors.push("manifest must be an object");
    return null;
  }
  const templates = validateTemplates(raw.templates, errors);
  const prompts = validatePrompts(raw.prompts, errors);
  if (raw.templates === undefined && raw.prompts === undefined) {
    errors.push("manifest must include templates and/or prompts");
  }
  return { ...(templates.length ? { templates } : {}), ...(prompts.length ? { prompts } : {}) };
}

function validateUrl(value: unknown, field: string, errors: string[]): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    errors.push(`${field} must be a URL string`);
    return undefined;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      errors.push(`${field} must use http(s)`);
      return undefined;
    }
    return value;
  } catch {
    errors.push(`${field} must be a valid URL`);
    return undefined;
  }
}

/** Validates an extension definition without throwing. */
export function validateExtension(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ["extension must be an object"] };

  const validId =
    stringField(input.id, "id", 64, errors) && ID_RE.test(input.id as string);
  if (typeof input.id === "string" && !ID_RE.test(input.id)) {
    errors.push("id must be 3-64 lowercase letters, digits and dashes");
  }
  stringField(input.name, "name", 120, errors);
  stringField(input.description, "description", 500, errors);
  stringField(input.category, "category", 60, errors);
  stringField(input.author, "author", 120, errors);
  if (!stringField(input.version, "version", 64, errors) || !SEMVER_RE.test(input.version as string)) {
    errors.push("version must be semantic versioning (for example 1.0.0)");
  }

  const permissions: ExtensionPermission[] = [];
  if (!Array.isArray(input.permissions)) {
    errors.push("permissions must be an array");
  } else {
    const seen = new Set<string>();
    for (const permission of input.permissions) {
      if (typeof permission !== "string" || !permissionSet.has(permission)) {
        errors.push(`unknown permission "${String(permission)}"`);
        continue;
      }
      if (seen.has(permission)) {
        errors.push(`duplicate permission "${permission}"`);
        continue;
      }
      seen.add(permission);
      permissions.push(permission as ExtensionPermission);
    }
  }

  const manifest = validateManifest(input.manifest, errors);
  const repoUrl = validateUrl(input.repoUrl, "repoUrl", errors);
  const docsUrl = validateUrl(input.docsUrl, "docsUrl", errors);

  if (errors.length > 0) return { ok: false, errors };
  if (!validId || !manifest) return { ok: false, errors: ["extension is invalid"] };

  return {
    ok: true,
    extension: {
      id: input.id as string,
      name: input.name as string,
      description: input.description as string,
      category: input.category as string,
      version: input.version as string,
      author: input.author as string,
      permissions,
      manifest,
      ...(repoUrl ? { repoUrl } : {}),
      ...(docsUrl ? { docsUrl } : {}),
    },
  };
}

/** Author-time helper that validates and freezes your extension definition. */
export function defineExtension(definition: ExtensionDefinition): ExtensionDefinition {
  const result = validateExtension(definition);
  if (!result.ok) {
    throw new Error(`Invalid extension "${String((definition as { id?: unknown })?.id)}":\n- ${result.errors.join("\n- ")}`);
  }
  return Object.freeze(result.extension);
}
