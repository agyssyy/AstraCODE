import {
  authHeaders,
  chatCompletionsUrl,
  mapHttpError,
  modelsUrl,
  networkError,
} from "./http.js";
import type {
  AIChatEvent,
  ChatRequestOptions,
  CompleteResult,
  ProviderConfig,
  RemoteModel,
} from "./types.js";
import { AiProviderError } from "./types.js";

type OpenAIDelta = {
  choices?: { delta?: { content?: string | { type?: string; text?: string }[] } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
};

function extractDeltaContent(delta: OpenAIDelta): string {
  const content = delta.choices?.[0]?.delta?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => (part && typeof part.text === "string" ? part.text : "")).join("");
  }
  return "";
}

export type SseEvent = { data: string };

export async function* readSseEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index = buffer.search(/\r?\n\r?\n/);
      while (index !== -1) {
        const raw = buffer.slice(0, index);
        buffer = buffer.slice(index).replace(/^\r?\n\r?\n/, "");
        const dataLines = raw
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart());
        if (dataLines.length > 0) {
          yield { data: dataLines.join("\n") };
        }
        index = buffer.search(/\r?\n\r?\n/);
      }
    }
    const tail = buffer.trim();
    if (tail.startsWith("data:")) {
      yield { data: tail.slice(5).trimStart() };
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamOpenAI(
  provider: ProviderConfig,
  options: ChatRequestOptions,
): AsyncGenerator<AIChatEvent> {
  const url = provider.chatCompletionsUrl ?? chatCompletionsUrl(provider.baseUrl);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...authHeaders(provider.apiKey),
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens,
        stream: true,
        ...(provider.kind === "openai" ? { stream_options: { include_usage: true } } : {}),
      }),
      signal: options.signal,
    });
  } catch (error) {
    throw networkError(error);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw mapHttpError(response.status, body);
  }
  if (!response.body) {
    throw new AiProviderError("bad_response", "The provider returned an empty stream.");
  }

  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  try {
    for await (const event of readSseEvents(response.body)) {
      if (event.data === "[DONE]") break;
      let parsed: OpenAIDelta;
      try {
        parsed = JSON.parse(event.data) as OpenAIDelta;
      } catch {
        continue;
      }
      if (parsed.usage) {
        inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
        outputTokens = parsed.usage.completion_tokens ?? outputTokens;
      }
      const text = extractDeltaContent(parsed);
      if (text) yield { type: "text", text };
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AiProviderError("aborted", "Request was cancelled.");
    }
    throw networkError(error);
  }

  if (inputTokens !== null || outputTokens !== null) {
    yield { type: "usage", inputTokens, outputTokens };
  }
}

export async function completeOpenAI(
  provider: ProviderConfig,
  options: ChatRequestOptions,
): Promise<CompleteResult> {
  const url = provider.chatCompletionsUrl ?? chatCompletionsUrl(provider.baseUrl);
  const started = performance.now();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(provider.apiKey) },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens,
        stream: false,
      }),
      signal: options.signal,
    });
  } catch (error) {
    throw networkError(error);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw mapHttpError(response.status, body);
  }
  const latencyMs = Math.round(performance.now() - started);
  const json = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  } | null;
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new AiProviderError("bad_response", "The provider response did not contain message content.");
  }
  return {
    text,
    inputTokens: json?.usage?.prompt_tokens ?? null,
    outputTokens: json?.usage?.completion_tokens ?? null,
    latencyMs,
  };
}

export async function listOpenAIModels(provider: ProviderConfig): Promise<RemoteModel[]> {
  let response: Response;
  try {
    response = await fetch(modelsUrl(provider.baseUrl), {
      headers: { Accept: "application/json", ...authHeaders(provider.apiKey) },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw networkError(error);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw mapHttpError(response.status, body);
  }
  const json = (await response.json().catch(() => null)) as {
    data?: { id?: string }[];
  } | null;
  const items = json?.data ?? [];
  return items
    .filter((m): m is { id: string } => typeof m.id === "string")
    .map((m) => ({ id: m.id }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
