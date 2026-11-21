import { AiProviderError } from "./types.js";

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function chatCompletionsUrl(baseUrl: string): string {
  const base = stripTrailingSlash(baseUrl);
  if (base.endsWith("/chat/completions")) return base;
  if (/\/v\d+$/.test(base)) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

export function modelsUrl(baseUrl: string): string {
  const base = stripTrailingSlash(baseUrl);
  if (base.endsWith("/chat/completions")) return base.replace(/\/chat\/completions$/, "/models");
  if (/\/v\d+$/.test(base)) return `${base}/models`;
  return `${base}/v1/models`;
}

export function ollamaBase(baseUrl: string): string {
  return stripTrailingSlash(baseUrl).replace(/\/api$/, "");
}

export function authHeaders(apiKey?: string | null): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

export function mapHttpError(status: number, body: string): AiProviderError {
  const snippet = body.slice(0, 400).replace(/\s+/g, " ");
  if (status === 401 || status === 403) {
    return new AiProviderError(
      "auth",
      `The provider rejected the API key (HTTP ${status}). Check the key in Model Hub.`,
      status,
    );
  }
  if (status === 404) {
    return new AiProviderError(
      "not_found",
      `The provider has no such model or endpoint (HTTP 404)${snippet ? `: ${snippet}` : "."}`,
      status,
    );
  }
  if (status === 429) {
    return new AiProviderError(
      "rate_limit",
      "The provider is rate limiting requests. Try again shortly.",
      status,
    );
  }
  return new AiProviderError(
    "bad_response",
    `The provider returned HTTP ${status}${snippet ? `: ${snippet}` : "."}`,
    status,
  );
}

export function networkError(error: unknown): AiProviderError {
  if (error instanceof AiProviderError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AiProviderError("aborted", "Request was cancelled.");
  }
  const message = error instanceof Error ? error.message : "Unknown network error";
  return new AiProviderError(
    "network",
    `Could not reach the provider. Check the base URL and network connection (${message}).`,
  );
}

export function parseRetryAfter(value: string | null): number {
  if (!value) return 0;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
}
