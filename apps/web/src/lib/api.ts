export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function apiBase(): string {
  if (typeof window !== "undefined") {
    return "/backend";
  }
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured && configured.length > 0) return configured.replace(/\/+$/, "");
  return "http://127.0.0.1:4000";
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; details?: unknown } })
      ?.error;
    throw new ApiClientError(
      response.status,
      error?.code ?? "request_failed",
      error?.message ?? `Request failed with HTTP ${response.status}.`,
      error?.details,
    );
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiFetch<T>(path, { signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    apiFetch<T>(path, { method: "POST", body, signal }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "DELETE", body }),
};

export type SseEvent = { event: string; data: unknown };

export async function streamSse(
  path: string,
  options: {
    body?: unknown;
    method?: "POST" | "GET";
    signal?: AbortSignal;
    onEvent: (event: SseEvent) => void;
  },
): Promise<void> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: options.method ?? "POST",
    credentials: "include",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with HTTP ${response.status}.`;
    let code = "request_failed";
    try {
      const json = (await response.json()) as { error?: { message?: string; code?: string } };
      message = json.error?.message ?? message;
      code = json.error?.code ?? code;
    } catch {
      /* ignore */
    }
    throw new ApiClientError(response.status, code, message);
  }
  if (!response.body) throw new ApiClientError(500, "no_stream", "The response was not streamed.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (raw: string) => {
    const lines = raw.split(/\r?\n/);
    let event = "message";
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length === 0) return;
    try {
      options.onEvent({ event, data: JSON.parse(dataLines.join("\n")) });
    } catch {
      /* ignore malformed frame */
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index = buffer.search(/\r?\n\r?\n/);
      while (index !== -1) {
        const raw = buffer.slice(0, index);
        buffer = buffer.slice(index).replace(/^\r?\n\r?\n/, "");
        dispatch(raw);
        index = buffer.search(/\r?\n\r?\n/);
      }
    }
    if (buffer.trim()) dispatch(buffer);
  } finally {
    reader.releaseLock();
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) {
    if (error.name === "AbortError") return "Cancelled.";
    if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
      return "Cannot reach the AstraCode API. Is it running?";
    }
    return error.message;
  }
  return "Something went wrong.";
}
