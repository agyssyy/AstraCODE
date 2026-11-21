import { z } from "zod";
import { isValidFilePath, normalizeFilePath } from "./utils.js";

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .email("Enter a valid email address")
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(200, "Password is too long");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(200),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, "This reset link is invalid").max(200),
  password: passwordSchema,
});

export const twoFactorVerifySchema = z.object({
  challengeId: z.string().uuid("Invalid verification request"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const twoFactorResendSchema = z.object({
  challengeId: z.string().uuid("Invalid verification request"),
});

export const twoFactorEnableSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your account password").max(200),
  appPassword: z
    .string()
    .trim()
    .max(64, "That app password is too long")
    .optional()
    .transform((value) => (value ?? "").replace(/\s+/g, "")),
});

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1, "Enter your password").max(200),
});

export const providerCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  kind: z.enum(["openai", "ollama", "custom"]),
  baseUrl: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .max(500)
    .refine((v) => v.startsWith("http://") || v.startsWith("https://"), "Only http(s) URLs are supported"),
  apiKey: z.string().max(600).optional().nullable(),
});

export const providerUpdateSchema = providerCreateSchema.partial().extend({
  apiKey: z.string().max(600).optional().nullable(),
  clearKey: z.boolean().optional(),
});

export const modelCreateSchema = z.object({
  providerId: z.string().uuid("Choose a provider"),
  modelName: z.string().trim().min(1, "Model id is required").max(200),
  label: z.string().trim().min(1, "Label is required").max(120),
  contextWindow: z.coerce.number().int().min(1024).max(2_000_000),
  maxOutput: z.coerce.number().int().min(64).max(131_072),
  notes: z.string().max(1000).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const modelUpdateSchema = modelCreateSchema
  .omit({ providerId: true, modelName: true })
  .partial()
  .extend({ isDefault: z.boolean().optional() });

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120),
  description: z.string().max(1000).default(""),
  template: z.string().trim().min(1).max(60).default("blank"),
  language: z.string().trim().max(32).optional(),
});

export const projectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  githubRepo: z
    .string()
    .trim()
    .max(300)
    .url("Enter a valid repository URL")
    .refine((v) => /^https:\/\/(www\.)?github\.com\//.test(v), "Only github.com URLs are supported")
    .nullable()
    .optional(),
});

const filePathSchema = z
  .string()
  .trim()
  .min(1, "Path is required")
  .max(240)
  .transform(normalizeFilePath)
  .refine(isValidFilePath, "Invalid file path");

export const fileWriteSchema = z.object({
  path: filePathSchema,
  content: z.string().max(500_000, "File is too large (max 500 KB)"),
});

export const fileRenameSchema = z.object({
  from: filePathSchema,
  to: filePathSchema,
});

export const fileDeleteSchema = z.object({
  path: filePathSchema,
});

export const projectImportSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000).default(""),
  files: z
    .array(z.object({ path: filePathSchema, content: z.string().max(300_000) }))
    .min(1, "Import needs at least one file")
    .max(200, "Too many files (max 200)"),
});

export const conversationCreateSchema = z.object({
  title: z.string().trim().max(200).optional(),
  modelId: z.string().uuid().nullable().optional(),
  systemPrompt: z.string().max(8000).nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export const conversationUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  modelId: z.string().uuid().nullable().optional(),
  systemPrompt: z.string().max(8000).nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export const chatSchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().trim().min(1, "Write a message").max(32_000),
  modelId: z.string().uuid("Choose a model"),
  systemPrompt: z.string().max(8000).nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  agentMode: z.boolean().optional().default(false),
  language: z.string().max(8).optional(),
});

export const execSchema = z.object({
  command: z.string().trim().min(1, "Command is required").max(2000),
});

export const apiSendSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  url: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .max(2000)
    .refine((v) => v.startsWith("http://") || v.startsWith("https://"), "Only http(s) URLs are supported"),
  headers: z
    .array(z.object({ key: z.string().max(200), value: z.string().max(4000) }))
    .max(50)
    .default([]),
  body: z.string().max(200_000).optional().nullable(),
});

export const benchmarkStartSchema = z.object({
  suiteId: z.string().min(1).max(60),
  modelIds: z.array(z.string().uuid()).min(1, "Select at least one model").max(4, "Compare up to 4 models"),
});

export const settingsPatchSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.enum(["en", "id", "es", "de", "fr", "ja", "pt", "zh"]).optional(),
  editorFontSize: z.number().int().min(10).max(24).optional(),
  editorTabSize: z.number().int().min(1).max(8).optional(),
  editorWordWrap: z.boolean().optional(),
  defaultModelId: z.string().uuid().nullable().optional(),
  agentApprovalRequired: z.boolean().optional(),
  privacyTelemetry: z.boolean().optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

export const extensionToggleSchema = z.object({
  enabled: z.boolean(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProviderCreateInput = z.infer<typeof providerCreateSchema>;
export type ModelCreateInput = z.infer<typeof modelCreateSchema>;
export type ChatInput = z.infer<typeof chatSchema>;
