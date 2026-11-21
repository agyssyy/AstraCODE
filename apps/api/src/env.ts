import path from "node:path";
import fs from "node:fs";
import { networkInterfaces } from "node:os";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

export const repoRoot = path.resolve(import.meta.dirname, "../../..");
const envFile = path.join(repoRoot, ".env");
if (fs.existsSync(envFile)) {
  loadEnv({ path: envFile });
} else {
  loadEnv();
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url().optional(),
  APP_ENCRYPTION_KEY: z
    .string()
    .min(1, "APP_ENCRYPTION_KEY is required. Run `pnpm setup` to generate one."),
  PREVIEW_SECRET: z
    .string()
    .min(16, "PREVIEW_SECRET must be at least 16 characters. Run `pnpm setup`."),
  DATABASE_URL: z.string().optional().or(z.literal("")),
  ASTRACODE_DATA_DIR: z.string().default("./data"),
  BUILTIN_AI_ENABLED: z.enum(["true", "false"]).default("true"),
  BUILTIN_AI_BASE_URL: z.string().url().default("https://text.pollinations.ai/openai"),
  BUILTIN_AI_CHAT_URL: z.string().url().optional().or(z.literal("")),
  BUILTIN_AI_API_KEY: z.string().optional().or(z.literal("")),
  BUILTIN_AI_MODEL: z.string().default("openai-fast"),
  BUILTIN_AI_LABEL: z.string().default("Astra Assistant"),
  BUILTIN_AI_CONTEXT_WINDOW: z.coerce.number().int().min(1024).max(2_000_000).default(32768),
  BUILTIN_AI_MAX_OUTPUT: z.coerce.number().int().min(64).max(131_072).default(4096),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  SMTP_USER: z.string().optional().or(z.literal("")),
  SMTP_PASS: z.string().optional().or(z.literal("")),
  SMTP_FROM: z.string().optional().or(z.literal("")),
  GOOGLE_CLIENT_ID: z.string().optional().or(z.literal("")),
  GOOGLE_CLIENT_SECRET: z.string().optional().or(z.literal("")),
  GOOGLE_REDIRECT_URI: z.string().url().optional().or(z.literal("")),
  AUTH_EMAIL_CODE_REQUIRED: z.enum(["auto", "true", "false"]).default("auto"),
  OPENCODE_FREE_ENABLED: z.enum(["true", "false"]).default("true"),
  OPENCODE_SERVER_URL: z.string().url().default("http://127.0.0.1:4096"),
  OPENCODE_SERVER_PASSWORD: z.string().optional().or(z.literal("")),
  OPENCODE_FREE_MODEL: z.string().default("deepseek-v4.1-flash-free"),
  OPENCODE_FREE_LABEL: z.string().default("DeepSeek V4.1 Flash"),
  OPENCODE_FREE_CONTEXT_WINDOW: z.coerce.number().int().min(1024).max(2_000_000).default(200_000),
  OPENCODE_FREE_MAX_OUTPUT: z.coerce.number().int().min(64).max(131_072).default(16_384),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issue = parsed.error.issues[0];
  console.error(`\n[astracode-api] Invalid environment: ${issue?.message ?? "unknown error"}`);
  console.error("Hint: run `pnpm setup` in the repository root to create .env with secure secrets.\n");
  process.exit(1);
}

const raw = parsed.data;
const encryptionKey = Buffer.from(raw.APP_ENCRYPTION_KEY, "base64");
if (encryptionKey.length !== 32) {
  console.error("[astracode-api] APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  process.exit(1);
}

export const env = {
  nodeEnv: raw.NODE_ENV,
  host: raw.API_HOST,
  port: raw.API_PORT,
  webOrigin:
    raw.WEB_ORIGIN || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000",
  encryptionKey,
  previewSecret: raw.PREVIEW_SECRET,
  databaseUrl: raw.DATABASE_URL || undefined,
  dataDir: path.isAbsolute(raw.ASTRACODE_DATA_DIR)
    ? raw.ASTRACODE_DATA_DIR
    : path.resolve(repoRoot, raw.ASTRACODE_DATA_DIR),
  emailCodeRequired:
    raw.AUTH_EMAIL_CODE_REQUIRED === "true" ||
    (raw.AUTH_EMAIL_CODE_REQUIRED === "auto" && Boolean(raw.SMTP_USER && raw.SMTP_PASS)),
};

export const smtp = {
  host: raw.SMTP_HOST,
  port: raw.SMTP_PORT,
  user: (raw.SMTP_USER || "").trim(),
  pass: (raw.SMTP_PASS || "").replace(/\s+/g, ""),
  from: raw.SMTP_FROM || raw.SMTP_USER || "",
  configured: Boolean(raw.SMTP_USER && raw.SMTP_PASS),
};

export const google = {
  clientId: (raw.GOOGLE_CLIENT_ID || "").trim(),
  clientSecret: (raw.GOOGLE_CLIENT_SECRET || "").trim(),
  redirectUri: (raw.GOOGLE_REDIRECT_URI || "").trim(),
  configured: Boolean(
    (raw.GOOGLE_CLIENT_ID || "").trim() && (raw.GOOGLE_CLIENT_SECRET || "").trim(),
  ),
};

export const opencodeFree = {
  enabled: raw.OPENCODE_FREE_ENABLED !== "false",
  baseUrl: raw.OPENCODE_SERVER_URL,
  password: raw.OPENCODE_SERVER_PASSWORD || "",
  model: raw.OPENCODE_FREE_MODEL,
  label: raw.OPENCODE_FREE_LABEL,
  contextWindow: raw.OPENCODE_FREE_CONTEXT_WINDOW,
  maxOutput: raw.OPENCODE_FREE_MAX_OUTPUT,
};

const builtinBaseUrl = raw.BUILTIN_AI_BASE_URL || "https://text.pollinations.ai/openai";
export const builtinAi = {
  enabled: raw.BUILTIN_AI_ENABLED !== "false" && Boolean(builtinBaseUrl),
  baseUrl: builtinBaseUrl,
  chatUrl:
    raw.BUILTIN_AI_CHAT_URL ||
    (builtinBaseUrl.includes("text.pollinations.ai") ? builtinBaseUrl : undefined),
  apiKey: raw.BUILTIN_AI_API_KEY || null,
  model: raw.BUILTIN_AI_MODEL,
  label: raw.BUILTIN_AI_LABEL,
  contextWindow: raw.BUILTIN_AI_CONTEXT_WINDOW,
  maxOutput: raw.BUILTIN_AI_MAX_OUTPUT,
};

const lanOrigins = Object.values(networkInterfaces())
  .flatMap((list) => list ?? [])
  .filter((iface) => iface.family === "IPv4" && !iface.internal)
  .map((iface) => `http://${iface.address}:3000`);

export const allowedOrigins = new Set(
  [
    env.webOrigin,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...lanOrigins,
  ].filter(Boolean),
);
