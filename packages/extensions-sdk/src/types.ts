/** Permissions an extension can request. Extensions are declarative: they never execute code. */
export const extensionPermissions = [
  "chat:presets",
  "project:read",
  "project:write",
  "terminal:exec",
  "network:fetch",
] as const;

export type ExtensionPermission = (typeof extensionPermissions)[number];

export type ExtensionFile = {
  /** POSIX-style path relative to the project root. */
  path: string;
  content: string;
};

export type ExtensionTemplate = {
  id: string;
  name: string;
  description: string;
  /** Monaco language id, for example `typescript` or `python`. */
  language: string;
  files: ExtensionFile[];
};

export type ExtensionPrompt = {
  id: string;
  title: string;
  description: string;
  /** System prompt injected into Astra AI conversations. */
  prompt: string;
};

export type ExtensionManifest = {
  templates?: ExtensionTemplate[];
  prompts?: ExtensionPrompt[];
};

export type ExtensionDefinition = {
  /** Globally unique kebab-case id, for example `react-starter-kit`. */
  id: string;
  name: string;
  description: string;
  category: string;
  /** Semantic version, for example `1.2.0`. */
  version: string;
  author: string;
  permissions: ExtensionPermission[];
  manifest: ExtensionManifest;
  repoUrl?: string;
  docsUrl?: string;
};

export type ValidationResult =
  | { ok: true; extension: ExtensionDefinition }
  | { ok: false; errors: string[] };
