import { networkError, stripTrailingSlash } from "./http.js";
import { readSseEvents } from "./openai.js";
import type {
  AIChatEvent,
  ChatMessage,
  ChatRequestOptions,
  CompleteResult,
  ProviderConfig,
  RemoteModel,
} from "./types.js";
import { AiProviderError } from "./types.js";

const sessions = new Map<string, string>();
const MAX_SESSIONS = 400;

type OpenCodeEvent = {
  type?: string;
  properties?: {
    sessionID?: string;
    partID?: string;
    field?: string;
    delta?: string;
    part?: { id?: string; type?: string; text?: string };
    status?: { type?: string };
    error?: { name?: string; message?: string; data?: { message?: string } };
    info?: {
      role?: string;
      tokens?: { input?: number; output?: number };
      error?: { name?: string; message?: string; data?: { message?: string } };
    };
  };
};

function baseUrl(provider: ProviderConfig): string {
  return stripTrailingSlash(provider.baseUrl || "http://127.0.0.1:4096");
}

function headers(provider: ProviderConfig, accept = "application/json"): Record<string, string> {
  const result: Record<string, string> = { Accept: accept, "Content-Type": "application/json" };
  if (provider.apiKey) {
    const token = Buffer.from(`opencode:${provider.apiKey}`).toString("base64");
    result.Authorization = `Basic ${token}`;
  }
  return result;
}

function sessionKey(provider: ProviderConfig, conversationId: string): string {
  return `${baseUrl(provider)}|${conversationId}`;
}

function remember(key: string, id: string): void {
  sessions.delete(key);
  sessions.set(key, id);
  while (sessions.size > MAX_SESSIONS) {
    const oldest = sessions.keys().next().value;
    if (!oldest) break;
    sessions.delete(oldest);
  }
}

function friendlyError(status: number, body: string): AiProviderError {
  const clean = body.slice(0, 400).replace(/\s+/g, " ");
  if (status === 401 || status === 403) {
    return new AiProviderError(
      "auth",
      "OpenCode Free could not authenticate with the local OpenCode runtime. Set OPENCODE_SERVER_PASSWORD and restart the API.",
      status,
    );
  }
  return new AiProviderError(
    "bad_response",
    `OpenCode Free returned HTTP ${status}${clean ? `: ${clean}` : "."}`,
    status,
  );
}

async function createSession(provider: ProviderConfig, title: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl(provider)}/session`, {
      method: "POST",
      headers: headers(provider),
      body: JSON.stringify({ title }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw networkError(error);
  }
  if (!response.ok) {
    throw friendlyError(response.status, await response.text().catch(() => ""));
  }
  const json = (await response.json().catch(() => null)) as { id?: string } | null;
  if (!json?.id) {
    throw new AiProviderError("bad_response", "OpenCode Free did not return a session id.");
  }
  return json.id;
}

function promptText(messages: ChatMessage[], fresh: boolean): string {
  const conversation = messages.filter((message) => message.role !== "system");
  if (!fresh) {
    const lastUser = [...conversation].reverse().find((message) => message.role === "user");
    return lastUser?.content ?? "";
  }
  return conversation
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n\n");
}

function systemText(messages: ChatMessage[]): string | undefined {
  return messages.find((message) => message.role === "system")?.content;
}

async function openEvents(
  provider: ProviderConfig,
  signal: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl(provider)}/event`, {
      headers: headers(provider, "text/event-stream"),
      signal,
    });
  } catch (error) {
    throw networkError(error);
  }
  if (!response.ok) {
    throw friendlyError(response.status, await response.text().catch(() => ""));
  }
  if (!response.body) {
    throw new AiProviderError("bad_response", "OpenCode Free returned an empty event stream.");
  }
  return response.body;
}

async function sendPrompt(
  provider: ProviderConfig,
  sessionId: string,
  options: ChatRequestOptions,
  text: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl(provider)}/session/${sessionId}/prompt_async`, {
      method: "POST",
      headers: headers(provider),
      body: JSON.stringify({
        model: { providerID: "opencode", modelID: options.model },
        agent: "plan",
        variant: "max",
        system: systemText(options.messages),
        parts: [{ type: "text", text }],
      }),
      signal: options.signal,
    });
  } catch (error) {
    throw networkError(error);
  }
  if (!response.ok) {
    throw friendlyError(response.status, await response.text().catch(() => ""));
  }
}

export async function* streamOpenCode(
  provider: ProviderConfig,
  options: ChatRequestOptions,
): AsyncGenerator<AIChatEvent> {
  const conversationId = options.conversationId ?? crypto.randomUUID();
  const key = sessionKey(provider, conversationId);
  let fresh = !sessions.has(key);
  let sessionId = sessions.get(key);

  if (!sessionId) {
    sessionId = await createSession(provider, "AstraCode chat");
    remember(key, sessionId);
  }

  const eventController = new AbortController();
  const abort = () => eventController.abort();
  options.signal?.addEventListener("abort", abort, { once: true });

  try {
    let events = await openEvents(provider, eventController.signal);
    try {
      await sendPrompt(provider, sessionId, options, promptText(options.messages, fresh));
    } catch (error) {
      if (error instanceof AiProviderError && error.status === 404) {
        sessions.delete(key);
        sessionId = await createSession(provider, "AstraCode chat");
        remember(key, sessionId);
        fresh = true;
        await sendPrompt(provider, sessionId, options, promptText(options.messages, fresh));
      } else {
        throw error;
      }
    }

    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    let sawText = false;
    const partTypes = new Map<string, string>();
    const bufferedDeltas = new Map<string, string[]>();

    for await (const event of readSseEvents(events)) {
      if (event.data === "[DONE]") break;
      let parsed: OpenCodeEvent;
      try {
        parsed = JSON.parse(event.data) as OpenCodeEvent;
      } catch {
        continue;
      }
      const props = parsed.properties;
      if (!props || props.sessionID !== sessionId) continue;

      if (parsed.type === "session.error" || props.info?.error) {
        const detail =
          props.error?.data?.message ??
          props.error?.message ??
          props.info?.error?.data?.message ??
          props.info?.error?.message;
        throw new AiProviderError(
          "bad_response",
          `OpenCode Free could not finish the reply${detail ? `: ${detail}` : "."}`,
        );
      }

      if (parsed.type === "message.part.updated" && props.part?.id && props.part.type) {
        partTypes.set(props.part.id, props.part.type);
        const pending = bufferedDeltas.get(props.part.id);
        if (pending) {
          bufferedDeltas.delete(props.part.id);
          for (const chunk of pending) {
            if (props.part.type === "reasoning") {
              yield { type: "reasoning", text: chunk };
            } else if (props.part.type === "text") {
              sawText = true;
              yield { type: "text", text: chunk };
            }
          }
        }
      }

      if (
        parsed.type === "message.part.delta" &&
        props.field === "text" &&
        props.delta &&
        props.partID
      ) {
        const kind = partTypes.get(props.partID);
        if (!kind) {
          const pending = bufferedDeltas.get(props.partID) ?? [];
          pending.push(props.delta);
          bufferedDeltas.set(props.partID, pending);
        } else if (kind === "reasoning") {
          yield { type: "reasoning", text: props.delta };
        } else if (kind === "text") {
          sawText = true;
          yield { type: "text", text: props.delta };
        }
      }

      if (parsed.type === "message.updated" && props.info?.role === "assistant") {
        if (typeof props.info.tokens?.input === "number") inputTokens = props.info.tokens.input;
        if (typeof props.info.tokens?.output === "number") outputTokens = props.info.tokens.output;
      }

      if (parsed.type === "session.idle") break;
      if (parsed.type === "session.status" && props.status?.type === "idle" && sawText) break;
    }

    if (!sawText) {
      throw new AiProviderError("bad_response", "OpenCode Free returned an empty reply. Try again.");
    }
    if (inputTokens !== null || outputTokens !== null) {
      yield { type: "usage", inputTokens, outputTokens };
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      if (sessionId) {
        void fetch(`${baseUrl(provider)}/session/${sessionId}/abort`, {
          method: "POST",
          headers: headers(provider),
        }).catch(() => undefined);
      }
      throw new AiProviderError("aborted", "Request was cancelled.");
    }
    throw networkError(error);
  } finally {
    options.signal?.removeEventListener("abort", abort);
    eventController.abort();
  }
}

export async function completeOpenCode(
  provider: ProviderConfig,
  options: ChatRequestOptions,
): Promise<CompleteResult> {
  const started = performance.now();
  let text = "";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  for await (const event of streamOpenCode(provider, options)) {
    if (event.type === "text") text += event.text;
    else if (event.type === "usage") {
      inputTokens = event.inputTokens;
      outputTokens = event.outputTokens;
    }
  }
  return {
    text,
    inputTokens,
    outputTokens,
    latencyMs: Math.round(performance.now() - started),
  };
}

export async function listOpenCodeModels(provider: ProviderConfig): Promise<RemoteModel[]> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl(provider)}/config/providers`, {
      headers: headers(provider),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw networkError(error);
  }
  if (!response.ok) {
    throw friendlyError(response.status, await response.text().catch(() => ""));
  }
  const json = (await response.json().catch(() => null)) as {
    providers?: { id?: string; models?: Record<string, unknown> }[];
  } | null;
  const opencode = json?.providers?.find((item) => item.id === "opencode");
  const ids = Object.keys(opencode?.models ?? {}).filter((id) => id.includes("free"));
  return ids.map((id) => ({ id })).sort((a, b) => a.id.localeCompare(b.id));
}
