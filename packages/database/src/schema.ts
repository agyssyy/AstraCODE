import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export type HeaderPair = { key: string; value: string };

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    twoFactorEmail: varchar("two_factor_email", { length: 320 }),
    smtpPasswordCipher: text("smtp_password_cipher"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_email_idx").on(t.email)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_reset_user_idx").on(t.userId)],
);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("oauth_provider_account_idx").on(t.provider, t.providerAccountId),
    index("oauth_user_idx").on(t.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    userAgent: text("user_agent"),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const aiProviders = pgTable(
  "ai_providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    kind: varchar("kind", { length: 16 }).notNull(),
    baseUrl: text("base_url").notNull(),
    apiKeyCipher: text("api_key_cipher"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_providers_user_idx").on(t.userId)],
);

export const models = pgTable(
  "models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => aiProviders.id, { onDelete: "cascade" }),
    modelName: text("model_name").notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    contextWindow: integer("context_window").notNull().default(8192),
    maxOutput: integer("max_output").notNull().default(2048),
    notes: text("notes"),
    isDefault: boolean("is_default").notNull().default(false),
    isAvailable: boolean("is_available"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("models_user_idx").on(t.userId),
    uniqueIndex("models_provider_name_idx").on(t.providerId, t.modelName),
  ],
);

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: varchar("theme", { length: 12 }).notNull().default("system"),
  language: varchar("language", { length: 8 }).notNull().default("en"),
  editorFontSize: integer("editor_font_size").notNull().default(14),
  editorTabSize: integer("editor_tab_size").notNull().default(2),
  editorWordWrap: boolean("editor_word_wrap").notNull().default(true),
  defaultModelId: uuid("default_model_id"),
  agentApprovalRequired: boolean("agent_approval_required").notNull().default(true),
  privacyTelemetry: boolean("privacy_telemetry").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").notNull().default(""),
    language: varchar("language", { length: 32 }).notNull().default("text"),
    template: varchar("template", { length: 40 }).notNull().default("blank"),
    githubRepo: text("github_repo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("projects_user_idx").on(t.userId, t.updatedAt)],
);

export const projectFiles = pgTable(
  "project_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("project_files_project_idx").on(t.projectId),
    uniqueIndex("project_files_path_idx").on(t.projectId, t.path),
  ],
);

export const projectActivity = pgTable(
  "project_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("project_activity_project_idx").on(t.projectId, t.createdAt)],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull().default("New conversation"),
    modelId: uuid("model_id"),
    systemPrompt: text("system_prompt"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("conversations_user_idx").on(t.userId, t.updatedAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 }).notNull(),
    content: text("content").notNull(),
    reasoning: text("reasoning"),
    modelLabel: varchar("model_label", { length: 160 }),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    latencyMs: integer("latency_ms"),
    usageSource: varchar("usage_source", { length: 16 }),
    actions: jsonb("actions").$type<AgentAction[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

export type AgentAction = {
  op: "write" | "delete";
  path: string;
  content?: string;
};

export const apiRequests = pgTable(
  "api_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 8 }).notNull(),
    url: text("url").notNull(),
    headers: jsonb("headers").$type<HeaderPair[]>().notNull().default([]),
    body: text("body"),
    status: integer("status"),
    responseSnippet: text("response_snippet"),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("api_requests_user_idx").on(t.userId, t.createdAt)],
);

export const benchmarkRuns = pgTable(
  "benchmark_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    suiteId: varchar("suite_id", { length: 60 }).notNull(),
    suiteName: varchar("suite_name", { length: 120 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("running"),
    modelCount: integer("model_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("benchmark_runs_user_idx").on(t.userId, t.createdAt)],
);

export const benchmarkResults = pgTable(
  "benchmark_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => benchmarkRuns.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    modelId: uuid("model_id").references(() => models.id, { onDelete: "set null" }),
    modelLabel: varchar("model_label", { length: 160 }).notNull(),
    promptId: varchar("prompt_id", { length: 40 }).notNull(),
    promptTitle: varchar("prompt_title", { length: 160 }).notNull(),
    output: text("output"),
    error: text("error"),
    latencyMs: integer("latency_ms"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    usageSource: varchar("usage_source", { length: 16 }).notNull().default("unavailable"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("benchmark_results_run_idx").on(t.runId),
    index("benchmark_results_user_idx").on(t.userId, t.createdAt),
  ],
);

export type ExtensionTemplate = {
  id: string;
  name: string;
  description: string;
  language: string;
  files: { path: string; content: string }[];
};

export type ExtensionPrompt = {
  id: string;
  title: string;
  description: string;
  prompt: string;
};

export type ExtensionManifest = {
  templates?: ExtensionTemplate[];
  prompts?: ExtensionPrompt[];
};

export const extensions = pgTable("extensions", {
  id: varchar("id", { length: 80 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 40 }).notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  author: varchar("author", { length: 80 }).notNull(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  manifest: jsonb("manifest").$type<ExtensionManifest>().notNull().default({}),
  repoUrl: text("repo_url"),
  docsUrl: text("docs_url"),
  verified: boolean("verified").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
});

export const extensionInstalls = pgTable(
  "extension_installs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    extensionId: varchar("extension_id", { length: 80 })
      .notNull()
      .references(() => extensions.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    installedAt: timestamp("installed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("extension_installs_user_idx").on(t.userId, t.extensionId)],
);

export const twoFactorChallenges = pgTable(
  "two_factor_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("two_factor_challenges_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectFile = typeof projectFiles.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type AiProvider = typeof aiProviders.$inferSelect;
export type Model = typeof models.$inferSelect;
export type ApiRequest = typeof apiRequests.$inferSelect;
export type BenchmarkRun = typeof benchmarkRuns.$inferSelect;
export type BenchmarkResult = typeof benchmarkResults.$inferSelect;
export type Extension = typeof extensions.$inferSelect;
export type ExtensionInstall = typeof extensionInstalls.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
