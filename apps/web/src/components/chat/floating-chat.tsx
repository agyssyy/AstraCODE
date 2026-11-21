"use client";

import * as React from "react";
import { ArrowUp, Bot, LoaderCircle, MessageSquare, Sparkles, Square, X } from "lucide-react";
import { Button, cn } from "@astracode/ui";
import type { ChatStreamEvent } from "@astracode/shared";
import { api, streamSse } from "@/lib/api";
import { AstraMark } from "@/components/brand/logo";

type Bubble = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const GREETING =
  "Hi! I'm Astra Assistant, included with AstraCode. Ask me anything — I can write code, explain errors and design APIs.";

export function FloatingChat() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Bubble[]>([
    { id: "greeting", role: "assistant", text: GREETING },
  ]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [streamText, setStreamText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [modelId, setModelId] = React.useState<string | null>(null);
  const conversationId = React.useRef<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const answerRef = React.useRef("");
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamText, open]);

  React.useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  React.useEffect(() => {
    if (!open || modelId) return;
    let cancelled = false;
    api
      .get<{ models: { id: string; isBuiltin?: boolean }[]; defaultModelId: string | null }>("/models")
      .then((data) => {
        if (cancelled) return;
        const chosen =
          data.defaultModelId ??
          data.models.find((m) => m.isBuiltin)?.id ??
          data.models[0]?.id ??
          null;
        setModelId(chosen);
        if (!chosen) setError("No model is configured yet. Add one in Model Hub to start chatting.");
      })
      .catch(() => {
        if (!cancelled) setError("Could not load models. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, modelId]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    if (!modelId) {
      setError("No model is available. Add one in Model Hub first.");
      return;
    }
    setInput("");
    setError(null);
    setStreamText("");
    answerRef.current = "";
    setStreaming(true);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamSse("/chat", {
        signal: controller.signal,
        body: {
          conversationId: conversationId.current,
          message: text,
          modelId,
          systemPrompt: null,
          projectId: null,
          agentMode: false,
        },
        onEvent: ({ data }) => {
          const event = data as ChatStreamEvent;
          switch (event.type) {
            case "meta":
              conversationId.current = event.conversationId;
              break;
            case "token":
              answerRef.current += event.text;
              setStreamText(answerRef.current);
              break;
            case "done":
              setMessages((prev) => [
                ...prev,
                {
                  id: `a-${Date.now()}`,
                  role: "assistant",
                  text: answerRef.current.trim() || "Done.",
                },
              ]);
              setStreamText("");
              answerRef.current = "";
              setStreaming(false);
              break;
            case "error":
              setError(event.message);
              setStreamText("");
              answerRef.current = "";
              setStreaming(false);
              break;
          }
        },
      });
      setStreaming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach Astra Assistant.");
      setStreaming(false);
    }
  };

  const stop = () => abortRef.current?.abort();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Astra chat"
        className={cn(
          "fixed bottom-24 right-4 z-50 flex size-13 items-center justify-center rounded-full",
          "bg-[hsl(var(--signal))] text-white shadow-[0_12px_32px_-8px_hsl(var(--signal)/0.7)]",
          "transition-transform duration-200 hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6 lg:size-14",
          open && "hidden",
        )}
        style={{ width: 52, height: 52 }}
      >
        <MessageSquare className="size-6" />
      </button>

      {open ? (
        <div
          className={cn(
            "fixed inset-x-3 bottom-28 z-50 flex flex-col overflow-hidden rounded-2xl border",
            "border-white/60 bg-[hsl(var(--card))]/85 shadow-2xl backdrop-blur-2xl",
            "h-[min(70dvh,560px)] dark:border-white/10",
            "lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[400px]",
          )}
        >
          <div className="flex items-center gap-2.5 border-b border-[hsl(var(--border))] px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-[hsl(var(--signal))]/12 text-[hsl(var(--signal))]">
              <AstraMark className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">Astra Assistant</p>
              <p className="flex items-center gap-1 text-[10.5px] text-[hsl(var(--muted-foreground))]">
                <span className="live-dot size-1.5 rounded-full bg-[hsl(var(--success))]" />
                Included · online
              </p>
            </div>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setOpen(false)} aria-label="Close chat">
              <X className="size-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className="flex max-w-[86%] items-end gap-2">
                  {m.role === "assistant" ? (
                    <span className="mb-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--signal))]/12 text-[hsl(var(--signal))]">
                      <Bot className="size-3.5" />
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "whitespace-pre-wrap break-words px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-sm",
                      m.role === "user"
                        ? "rounded-[18px] rounded-br-md bg-[hsl(var(--signal))] text-white"
                        : "rounded-[18px] rounded-bl-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/60 text-[hsl(var(--foreground))]",
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            ))}

            {streamText ? (
              <div className="flex justify-start">
                <div className="flex max-w-[86%] items-end gap-2">
                  <span className="mb-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--signal))]/12 text-[hsl(var(--signal))]">
                    <Sparkles className="size-3.5" />
                  </span>
                  <div className="whitespace-pre-wrap break-words rounded-[18px] rounded-bl-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/60 px-3.5 py-2.5 text-[12.5px] leading-relaxed">
                    {streamText}
                    <span className="ml-0.5 inline-block animate-pulse">▍</span>
                  </div>
                </div>
              </div>
            ) : null}

            {streaming && !streamText ? (
              <div className="flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                <LoaderCircle className="size-3.5 animate-spin" /> Astra is thinking…
              </div>
            ) : null}

            {error ? (
              <p className="rounded-lg bg-[hsl(var(--destructive))]/10 px-3 py-2 text-[11px] text-[hsl(var(--destructive))]">
                {error}
              </p>
            ) : null}
          </div>

          <div className="border-t border-[hsl(var(--border))] p-3">
            <div className="flex items-end gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-1.5 pl-3">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Message Astra…"
                className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-[12.5px] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
              {streaming ? (
                <Button size="icon" variant="secondary" className="size-8 rounded-lg" onClick={stop} aria-label="Stop">
                  <Square className="size-3.5" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="size-8 rounded-lg bg-[hsl(var(--signal))] text-white"
                  onClick={() => void send()}
                  disabled={!input.trim()}
                  aria-label="Send"
                >
                  <ArrowUp className="size-4" />
                </Button>
              )}
            </div>
            <p className="mt-1.5 text-center text-[10px] text-[hsl(var(--muted-foreground))]">
              Enter to send · Shift+Enter for a new line
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
