export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type ProviderKind = "openai" | "ollama" | "custom";

export type HeaderPair = { key: string; value: string };

export type UsageSource = "provider" | "estimated" | "unavailable";

export type TokenUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  source: UsageSource;
};

export type AgentAction = {
  op: "write" | "delete";
  path: string;
  content?: string;
};

export type ChatStreamEvent =
  | { type: "meta"; conversationId: string; userMessageId: string }
  | { type: "token"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "usage"; usage: TokenUsage; latencyMs: number }
  | { type: "actions"; actions: AgentAction[] }
  | { type: "done"; conversationId: string; messageId: string; title: string }
  | { type: "error"; message: string };

export type ExecStreamEvent =
  | { type: "started"; cwd: string }
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
  | { type: "exit"; code: number | null; timedOut: boolean }
  | { type: "error"; message: string };

export type ExtensionManifest = {
  templates?: {
    id: string;
    name: string;
    description: string;
    language: string;
    files: { path: string; content: string }[];
  }[];
  prompts?: {
    id: string;
    title: string;
    description: string;
    prompt: string;
  }[];
};

export type ApiErrorShape = { error: { code: string; message: string; details?: unknown } };

export type SessionInfo = {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
};

export type ProjectSummary = {
  id: string;
  name: string;
  description: string;
  language: string;
  template: string;
  githubRepo: string | null;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
};

export type ProjectFileDto = {
  id: string;
  projectId: string;
  path: string;
  content: string;
  updatedAt: string;
};

export type ModelDto = {
  id: string;
  providerId: string;
  providerName: string;
  providerKind: ProviderKind;
  modelName: string;
  label: string;
  contextWindow: number;
  maxOutput: number;
  notes: string | null;
  isDefault: boolean;
  isAvailable: boolean | null;
  lastCheckedAt: string | null;
  createdAt: string;
  isBuiltin?: boolean;
};

export type ProviderDto = {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  hasKey: boolean;
  keyHint: string | null;
  createdAt: string;
  modelCount: number;
};

export type ConversationSummary = {
  id: string;
  title: string;
  projectId: string | null;
  modelId: string | null;
  updatedAt: string;
  createdAt: string;
  messageCount: number;
};

export type MessageDto = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning: string | null;
  modelLabel: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  usageSource: UsageSource | null;
  latencyMs: number | null;
  actions: AgentAction[] | null;
  createdAt: string;
};

export type BenchmarkSuite = {
  id: string;
  name: string;
  description: string;
  prompts: { id: string; title: string; language: string; prompt: string }[];
};

export type BenchmarkResultDto = {
  id: string;
  promptId: string;
  promptTitle: string;
  modelId: string | null;
  modelLabel: string;
  output: string | null;
  error: string | null;
  latencyMs: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  usageSource: UsageSource;
};

export type BenchmarkRunDto = {
  id: string;
  suiteId: string;
  suiteName: string;
  status: string;
  modelCount: number;
  createdAt: string;
  completedAt: string | null;
};

export type ExtensionDto = {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  permissions: string[];
  manifest: ExtensionManifest;
  repoUrl: string | null;
  docsUrl: string | null;
  verified: boolean;
  installs: number;
  installed: boolean;
  enabled: boolean;
};

export type UserSettingsDto = {
  theme: "light" | "dark" | "system";
  language: string;
  editorFontSize: number;
  editorTabSize: number;
  editorWordWrap: boolean;
  defaultModelId: string | null;
  agentApprovalRequired: boolean;
  privacyTelemetry: boolean;
};

export type StatsDto = {
  projects: number;
  conversations: number;
  models: number;
  providers: number;
  benchmarkRuns: number;
  extensionsInstalled: number;
  recentProjects: ProjectSummary[];
  recentConversations: ConversationSummary[];
  defaultModel: { id: string; label: string } | null;
  databaseDriver: "pglite" | "postgres";
};
