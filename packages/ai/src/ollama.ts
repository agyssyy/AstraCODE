import { authHeaders, networkError, ollamaBase } from "./http.js";
import type {
  AIChatEvent,
  ChatRequestOptions,
  CompleteResult,
  ProviderConfig,
  RemoteModel,
} from "./types.js";
import { AiProviderError } from "./types.js";

type OllamaChunk = {
  message?: { content?: string };
  response?: string;
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
};

export async function* streamOllama(
  provider: ProviderConfig,
  options: ChatRequestOptions,
): AsyncGenerator<AIChatEvent> {
  const url = `${ollamaBase(provider.baseUrl)}/api/chat`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(provider.apiKey) },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.4,
          ...(options.maxTokens ? { num_predict: options.maxTokens } : {}),
        },
      }),
      signal: options.signal,
    });
  } catch (error) {
    throw networkError(error);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AiProviderError(
      response.status === 404 ? "not_found" : "bad_response",
      `Ollama returned HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : "."}`,
      response.status,
    );
  }
  if (!response.body) {
    throw new AiProviderError("bad_response", "Ollama returned an empty stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let usage: { input: number | null; output: number | null } | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let chunk: OllamaChunk;
        try {
          chunk = JSON.parse(trimmed) as OllamaChunk;
        } catch {
          continue;
        }
        const text = chunk.message?.content ?? chunk.response ?? "";
        if (text) yield { type: "text", text };
        if (chunk.done) {
          usage = {
            input: chunk.prompt_eval_count ?? null,
            output: chunk.eval_count ?? null,
          };
        }
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AiProviderError("aborted", "Request was cancelled.");
    }
    throw networkError(error);
  } finally {
    reader.releaseLock();
  }

  if (usage) {
    yield { type: "usage", inputTokens: usage.input, outputTokens: usage.output };
  }
}

export async function completeOllama(
  provider: ProviderConfig,
  options: ChatRequestOptions,
): Promise<CompleteResult> {
  const url = `${ollamaBase(provider.baseUrl)}/api/chat`;
  const started = performance.now();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(provider.apiKey) },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.2,
          ...(options.maxTokens ? { num_predict: options.maxTokens } : {}),
        },
      }),
      signal: options.signal,
    });
  } catch (error) {
    throw networkError(error);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AiProviderError(
      "bad_response",
      `Ollama returned HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : "."}`,
      response.status,
    );
  }
  const latencyMs = Math.round(performance.now() - started);
  const json = (await response.json().catch(() => null)) as OllamaChunk | null;
  const text = json?.message?.content ?? json?.response;
  if (typeof text !== "string") {
    throw new AiProviderError("bad_response", "Ollama response did not contain message content.");
  }
  return {
    text,
    inputTokens: json?.prompt_eval_count ?? null,
    outputTokens: json?.eval_count ?? null,
    latencyMs,
  };
}

export async function listOllamaModels(provider: ProviderConfig): Promise<RemoteModel[]> {
  let response: Response;
  try {
    response = await fetch(`${ollamaBase(provider.baseUrl)}/api/tags`, {
      headers: { Accept: "application/json", ...authHeaders(provider.apiKey) },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw networkError(error);
  }
  if (!response.ok) {
    throw new AiProviderError(
      "bad_response",
      `Ollama returned HTTP ${response.status}. Is the server running?`,
      response.status,
    );
  }
  const json = (await response.json().catch(() => null)) as {
    models?: { name?: string }[];
  } | null;
  return (json?.models ?? [])
    .filter((m): m is { name: string } => typeof m.name === "string")
    .map((m) => ({ id: m.name }));
}
