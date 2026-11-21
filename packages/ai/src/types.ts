export type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };
export type ProviderKind = "openai" | "ollama" | "custom" | "opencode";

export type ProviderConfig = {
  id?: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey?: string | null;
  chatCompletionsUrl?: string;
};

export type ChatRequestOptions = {
  model: string;
  messages: ChatMessage[];
  conversationId?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export type AIChatEvent =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "usage"; inputTokens: number | null; outputTokens: number | null };

export type CompleteResult = {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
};

export type RemoteModel = { id: string; label?: string };

export type AiErrorCode =
  | "auth"
  | "rate_limit"
  | "not_found"
  | "network"
  | "timeout"
  | "bad_response"
  | "aborted";

export class AiProviderError extends Error {
  readonly code: AiErrorCode;
  readonly status: number | null;

  constructor(code: AiErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
    this.status = status;
  }
}
