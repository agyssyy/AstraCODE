"use client";

import * as React from "react";
import {
  Braces,
  Check,
  Clock,
  Copy,
  History,
  LoaderCircle,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Tooltip,
  cn,
} from "@astracode/ui";
import { toast } from "sonner";
import type { HeaderPair } from "@astracode/shared";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatBytes, timeAgo } from "@/lib/format";
import { ConfirmDialog } from "@/components/ui-extras/confirm-dialog";
import { PageHeader } from "@/components/ui-extras/page-header";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

type ApiResponse = {
  id: string;
  status: number;
  statusText: string;
  headers: HeaderPair[];
  body: string;
  latencyMs: number;
  sizeBytes: number;
  truncated: boolean;
  isText: boolean;
  createdAt: string;
};

type HistoryItem = {
  id: string;
  method: Method;
  url: string;
  headers: HeaderPair[] | null;
  body: string | null;
  status: number;
  responseSnippet: string | null;
  latencyMs: number;
  createdAt: string;
};

const METHODS: Method[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const QUICK_REQUESTS: { label: string; method: Method; url: string }[] = [
  { label: "Local health", method: "GET", url: "http://127.0.0.1:4000/health" },
  { label: "List models", method: "GET", url: "http://127.0.0.1:4000/models" },
  { label: "List projects", method: "GET", url: "http://127.0.0.1:4000/projects" },
];

const METHOD_COLOR: Record<Method, string> = {
  GET: "text-[hsl(var(--success))]",
  POST: "text-[hsl(var(--primary))]",
  PUT: "text-[hsl(var(--warning))]",
  PATCH: "text-[hsl(var(--warning))]",
  DELETE: "text-[hsl(var(--destructive))]",
  HEAD: "text-[hsl(var(--muted-foreground))]",
  OPTIONS: "text-[hsl(var(--muted-foreground))]",
};

export function ApiView() {
  const { data: historyData, refetch: refetchHistory, setData: setHistoryData } = useApi<{
    history: HistoryItem[];
  }>("/api-center/history");

  const [method, setMethod] = React.useState<Method>("GET");
  const [url, setUrl] = React.useState("http://127.0.0.1:4000/health");
  const [headers, setHeaders] = React.useState<HeaderPair[]>([{ key: "Accept", value: "application/json" }]);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [response, setResponse] = React.useState<ApiResponse | null>(null);
  const [tab, setTab] = React.useState<"body" | "headers">("body");
  const [pretty, setPretty] = React.useState(true);
  const [historySearch, setHistorySearch] = React.useState("");
  const [clearHistory, setClearHistory] = React.useState(false);

  const history = historyData?.history ?? [];

  const prettyBody = React.useMemo(() => {
    if (!response) return "";
    if (!pretty) return response.body;
    try {
      return JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      return response.body;
    }
  }, [response, pretty]);

  const send = async () => {
    if (!url.trim() || sending) return;
    setSending(true);
    try {
      const result = await api.post<ApiResponse>("/api-center/send", {
        method,
        url: url.trim(),
        headers: headers.filter((pair) => pair.key.trim()),
        body: body.trim() ? body : undefined,
      });
      setResponse(result);
      setTab("body");
      refetchHistory();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const loadHistory = (item: HistoryItem) => {
    setMethod(item.method);
    setUrl(item.url);
    setHeaders(
      (item.headers ?? [])
        .filter((pair) => !pair.value.includes("•"))
        .map((pair) => ({ key: pair.key, value: pair.value })),
    );
    setBody(item.body ?? "");
    setResponse(null);
    toast.message("Request loaded", {
      description: "Secret header values are never stored, so they were omitted.",
    });
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      await api.delete(`/api-center/history/${id}`);
      setHistoryData((prev) =>
        prev ? { history: prev.history.filter((item) => item.id !== id) } : prev,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const clearAllHistory = async () => {
    try {
      await api.delete("/api-center/history");
      setHistoryData({ history: [] });
      setClearHistory(false);
      toast.success("History cleared");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const filteredHistory = history.filter((item) =>
    `${item.method} ${item.url}`.toLowerCase().includes(historySearch.toLowerCase()),
  );

  const statusVariant =
    !response
      ? "outline"
      : response.status < 300
        ? "success"
        : response.status < 400
          ? "warning"
          : "destructive";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Platform / API Center"
        title="API Explorer"
        description="Send HTTP requests through the AstraCode server, inspect responses and keep a masked history."
        actions={
          <Badge variant="outline" className="w-fit font-mono text-[9px] uppercase tracking-[0.1em]">
            Server-side · 20s timeout
          </Badge>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
          Quick requests
        </span>
        {QUICK_REQUESTS.map((request) => (
          <button
            key={request.label}
            type="button"
            onClick={() => {
              setMethod(request.method);
              setUrl(request.url);
            }}
            className="group flex items-center gap-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 font-mono text-[9.5px] text-[hsl(var(--muted-foreground))] transition-all hover:-translate-y-px hover:border-[hsl(var(--signal))]/50 hover:text-[hsl(var(--foreground))]"
          >
            <span className={cn("text-[8.5px] font-semibold", METHOD_COLOR[request.method])}>{request.method}</span>
            {request.label}
          </button>
        ))}
      </div>

      <div className="stagger-fade grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-3">
          <Card>
            <CardContent className="space-y-3 p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as Method)}
                  className={cn(
                    "h-9 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 font-mono text-[12px] font-semibold outline-none focus:border-[hsl(var(--primary))]/50",
                    METHOD_COLOR[method],
                  )}
                  aria-label="HTTP method"
                >
                  {METHODS.map((item) => (
                    <option key={item} value={item} className="text-[hsl(var(--foreground))]">
                      {item}
                    </option>
                  ))}
                </select>
                <Input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="https://api.example.com/v1/users"
                  className="h-9 flex-1 font-mono text-[12px]"
                  spellCheck={false}
                />
                <Button onClick={() => void send()} disabled={sending || !url.trim()}>
                  {sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send
                </Button>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Headers
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10.5px]"
                      onClick={() =>
                        setHeaders((prev) => {
                          if (prev.some((pair) => pair.key.toLowerCase() === "content-type")) return prev;
                          return [...prev, { key: "Content-Type", value: "application/json" }];
                        })
                      }
                    >
                      + Content-Type
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10.5px]"
                      onClick={() => setHeaders((prev) => [...prev, { key: "", value: "" }])}
                    >
                      <Plus className="size-3" /> Add
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {headers.map((pair, index) => (
                    <div key={index} className="flex gap-1.5">
                      <Input
                        value={pair.key}
                        onChange={(event) =>
                          setHeaders((prev) =>
                            prev.map((item, i) => (i === index ? { ...item, key: event.target.value } : item)),
                          )
                        }
                        placeholder="Header"
                        className="h-8 flex-1 font-mono text-[11.5px]"
                      />
                      <Input
                        value={pair.value}
                        onChange={(event) =>
                          setHeaders((prev) =>
                            prev.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)),
                          )
                        }
                        placeholder="Value"
                        className="h-8 flex-[1.4] font-mono text-[11.5px]"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => setHeaders((prev) => prev.filter((_, i) => i !== index))}
                        aria-label="Remove header"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  {headers.length === 0 ? (
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">No custom headers.</p>
                  ) : null}
                </div>
              </div>

              {method !== "GET" && method !== "HEAD" ? (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Body
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10.5px]"
                      onClick={() => {
                        try {
                          setBody(JSON.stringify(JSON.parse(body), null, 2));
                        } catch {
                          toast.error("Body is not valid JSON.");
                        }
                      }}
                    >
                      <Braces className="size-3" /> Format JSON
                    </Button>
                  </div>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={5}
                    placeholder={'{\n  "name": "Ada"\n}'}
                    spellCheck={false}
                    className="w-full resize-y rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 font-mono text-[11.5px] leading-relaxed outline-none focus:border-[hsl(var(--primary))]/50"
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="min-h-[320px]">
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-[hsl(var(--border))] px-3 py-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-[12px]">Response</CardTitle>
                {response ? (
                  <div className="flex items-center gap-1.5">
                    <Badge variant={statusVariant}>
                      {response.status} {response.statusText}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                      <Clock className="size-2.5" /> {response.latencyMs} ms
                    </span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      {formatBytes(response.sizeBytes)}
                    </span>
                  </div>
                ) : null}
              </div>
              {response ? (
                <div className="flex items-center gap-1">
                  <div className="flex rounded-md border border-[hsl(var(--border))] p-0.5">
                    {(["body", "headers"] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setTab(item)}
                        className={cn(
                          "rounded px-2 py-0.5 text-[10.5px] capitalize transition-colors",
                          tab === item
                            ? "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                            : "text-[hsl(var(--muted-foreground))]",
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <Tooltip content="Copy response">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={async () => {
                        await navigator.clipboard.writeText(response.body);
                        toast.success("Response copied");
                      }}
                      aria-label="Copy response"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </Tooltip>
                  {tab === "body" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10.5px]"
                      onClick={() => setPretty((value) => !value)}
                    >
                      {pretty ? <Check className="size-3" /> : null} Pretty
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="p-0">
              {!response ? (
                <div className="blueprint relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden px-4 text-center">
                  <div className="absolute inset-0 bg-[hsl(var(--card))]/60" />
                  <div className="relative">
                    <span className="mx-auto flex size-11 items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs">
                      <Send className="size-5 text-[hsl(var(--signal))]" />
                    </span>
                    <p className="mt-3 text-[13px] font-medium">Response inspector</p>
                    <p className="mt-1 max-w-xs text-[11.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                      Send a request to inspect the status, latency, headers and body. Nothing leaves your server.
                    </p>
                    <p className="mt-4 inline-flex items-center gap-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))]">
                      <kbd className="font-mono">⌘</kbd> + <kbd className="font-mono">↵</kbd> to send
                    </p>
                  </div>
                </div>
              ) : tab === "headers" ? (
                <div className="max-h-[380px] overflow-y-auto p-3 font-mono text-[11px]">
                  {response.headers.map((header) => (
                    <div key={header.key} className="flex gap-2 border-b border-[hsl(var(--border))]/60 py-1 last:border-0">
                      <span className="w-1/3 shrink-0 text-[hsl(var(--muted-foreground))]">{header.key}</span>
                      <span className="break-all">{header.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-h-[440px] overflow-auto">
                  {response.truncated ? (
                    <p className="border-b border-[hsl(var(--border))] bg-[hsl(var(--warning))]/10 px-3 py-1.5 text-[10.5px] text-[hsl(var(--warning))]">
                      Response truncated at 400 KB.
                    </p>
                  ) : null}
                  <pre className="whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-[1.55]">
                    {response.isText ? prettyBody : "(binary response)"}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <History className="size-4 text-[hsl(var(--muted-foreground))]" /> History
            </CardTitle>
            {history.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10.5px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                onClick={() => setClearHistory(true)}
              >
                Clear
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <Input
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Filter history…"
                className="h-7 pl-7 text-[11px]"
              />
            </div>
            {filteredHistory.length === 0 ? (
              <div className="border border-dashed border-[hsl(var(--border))] px-3 py-7 text-center">
                <History className="mx-auto size-4 text-[hsl(var(--muted-foreground))]/50" />
                <p className="mt-2 text-[11.5px] text-[hsl(var(--muted-foreground))]">
                  {history.length === 0 ? "Requests you send will appear here." : "No matching requests."}
                </p>
              </div>
            ) : (
              <ul className="max-h-[560px] space-y-0.5 overflow-y-auto">
                {filteredHistory.map((item) => (
                  <li key={item.id} className="group flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => loadHistory(item)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-[hsl(var(--muted))]"
                    >
                      <span className={cn("w-10 shrink-0 font-mono text-[9.5px] font-semibold", METHOD_COLOR[item.method])}>
                        {item.method}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px]">{item.url}</span>
                        <span className="block text-[9.5px] text-[hsl(var(--muted-foreground))]">
                          {item.status} · {item.latencyMs} ms · {timeAgo(item.createdAt)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label="Delete request"
                      onClick={() => void deleteHistoryItem(item.id)}
                      className="rounded p-1 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity hover:text-[hsl(var(--destructive))] group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={clearHistory}
        onOpenChange={setClearHistory}
        title="Clear request history?"
        description="All stored requests for this account will be deleted. This cannot be undone."
        confirmLabel="Clear history"
        destructive
        onConfirm={clearAllHistory}
      />
    </div>
  );
}
