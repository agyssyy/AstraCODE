"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Bot,
  Brain,
  Check,
  ChevronDown,
  Code2,
  FolderKanban,
  LoaderCircle,
  MessageSquare,
  PanelLeft,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  User,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  Spinner,
  Switch,
  Textarea,
  Tooltip,
  buttonVariants,
  cn,
} from "@astracode/ui";
import { toast } from "sonner";
import type {
  AgentAction,
  ChatStreamEvent,
  ConversationSummary,
  MessageDto,
  ModelDto,
  ProjectSummary,
  TokenUsage,
} from "@astracode/shared";
import { useApi } from "@/lib/use-api";
import { api, errorMessage, streamSse } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useUiStore } from "@/store/ui";
import { AstraMark } from "@/components/brand/logo";
import { Markdown, CopyButton } from "./markdown";
import { AgentActionCard } from "./action-card";
import { ConfirmDialog } from "@/components/ui-extras/confirm-dialog";

type Preset = { id: string; title: string; description: string; prompt: string };

type ConversationDetail = {
  id: string;
  title: string;
  projectId: string | null;
  modelId: string | null;
  systemPrompt: string | null;
  createdAt: string;
  updatedAt: string;
};

const SUGGESTIONS = [
  { icon: Code2, title: "Explain an error", prompt: "Explain this error and how to fix it:\n\n```\n" },
  { icon: Wand2, title: "Build a component", prompt: "Write a React component that " },
  { icon: Bot, title: "Design an API", prompt: "Design a REST API for " },
  { icon: Sparkles, title: "Review code", prompt: "Review this code for bugs, security issues and readability:\n\n```\n" },
];

export function ChatView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("c");

  const agentMode = useUiStore((s) => s.chatAgentMode);
  const setAgentMode = useUiStore((s) => s.setChatAgentMode);
  const storedModelId = useUiStore((s) => s.chatModelId);
  const setStoredModelId = useUiStore((s) => s.setChatModelId);

  const { data: modelsData, loading: modelsLoading } = useApi<{
    models: ModelDto[];
    defaultModelId: string | null;
  }>("/models");
  const {
    data: conversationsData,
    refetch: reloadConversations,
    setData: setConversationsData,
  } = useApi<{ conversations: ConversationSummary[] }>("/conversations");
  const { data: projectsData } = useApi<{ projects: ProjectSummary[] }>("/projects");
  const { data: presetsData } = useApi<{ presets: Preset[] }>("/chat/presets");
  const {
    data: conversationData,
    refetch: reloadConversation,
    setData: setConversationData,
    loading: conversationLoading,
  } = useApi<{ conversation: ConversationDetail; messages: MessageDto[] }>(
    activeId ? `/conversations/${activeId}` : null,
  );

  const [modelId, setModelId] = React.useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = React.useState("");
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState(() => searchParams.get("q") ?? "");
  const [streaming, setStreaming] = React.useState(false);
  const [streamText, setStreamText] = React.useState("");
  const [streamReasoning, setStreamReasoning] = React.useState("");
  const [streamUsage, setStreamUsage] = React.useState<TokenUsage | null>(null);
  const [pendingActions, setPendingActions] = React.useState<AgentAction[]>([]);
  const [optimisticUser, setOptimisticUser] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [promptDraft, setPromptDraft] = React.useState("");
  const [promptOpen, setPromptOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ConversationSummary | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [applied, setApplied] = React.useState<Set<string>>(new Set());

  const abortRef = React.useRef<AbortController | null>(null);
  const streamConversationRef = React.useRef<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const refreshConversation = React.useCallback(
    async (id: string) => {
      try {
        const result = await api.get<{
          conversation: ConversationDetail;
          messages: MessageDto[];
        }>(`/conversations/${id}`);
        setConversationData(result);
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setStreamText("");
      }
    },
    [setConversationData],
  );

  const models = modelsData?.models ?? [];
  const projects = projectsData?.projects ?? [];
  const presets = presetsData?.presets ?? [];
  const messages = conversationData?.messages ?? [];

  React.useEffect(() => {
    if (!modelsData || models.length === 0) return;
    if (modelId && models.some((m) => m.id === modelId)) return;
    const preferred =
      models.find((m) => m.id === storedModelId) ??
      models.find((m) => m.id === modelsData.defaultModelId) ??
      models[0];
    if (preferred) setModelId(preferred.id);
  }, [modelsData, models, modelId, storedModelId]);

  React.useEffect(() => {
    if (!conversationData) return;
    setSystemPrompt(conversationData.conversation.systemPrompt ?? "");
    setProjectId(conversationData.conversation.projectId);
    if (conversationData.conversation.modelId) {
      setModelId(conversationData.conversation.modelId);
    }
  }, [conversationData]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, streamText, streamReasoning, pendingActions.length]);

  React.useEffect(() => {
    if (activeId && activeId === streamConversationRef.current) return;
    streamConversationRef.current = null;
    setError(null);
    setPendingActions([]);
    setStreamText("");
    setStreamReasoning("");
    setStreamUsage(null);
    setOptimisticUser(null);
  }, [activeId]);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const selectModel = (id: string) => {
    setModelId(id);
    setStoredModelId(id);
  };

  const selectConversation = (id: string | null) => {
    abortRef.current?.abort();
    setStreaming(false);
    setSidebarOpen(false);
    router.push(id ? `/chat?c=${id}` : "/chat");
  };

  const stop = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setOptimisticUser(null);
    setStreamText("");
    window.setTimeout(() => {
      reloadConversation();
      reloadConversations();
    }, 700);
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || streaming) return;
    if (!modelId) {
      toast.error("Add a model in Model Hub first.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setInput("");
    setError(null);
    setOptimisticUser(text);
    setStreamText("");
    setStreamReasoning("");
    setStreamUsage(null);
    setPendingActions([]);
    setStreaming(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    let conversationId = activeId;
    let finished = false;

    try {
      await streamSse("/chat", {
        signal: controller.signal,
        body: {
          conversationId: activeId,
          message: text,
          modelId,
          systemPrompt: systemPrompt.trim() ? systemPrompt : null,
          projectId,
          agentMode,
        },
        onEvent: ({ data }) => {
          const event = data as ChatStreamEvent;
          switch (event.type) {
            case "meta":
              conversationId = event.conversationId;
              streamConversationRef.current = event.conversationId;
              if (!activeId) router.replace(`/chat?c=${event.conversationId}`);
              break;
            case "token":
              setStreamText((prev) => prev + event.text);
              break;
            case "reasoning":
              setStreamReasoning((prev) => prev + event.text);
              break;
            case "usage":
              setStreamUsage(event.usage);
              break;
            case "actions":
              setPendingActions(event.actions);
              break;
            case "done":
              finished = true;
              setStreaming(false);
              setOptimisticUser(null);
              setStreamText("");
              setStreamReasoning("");
              setStreamUsage(null);
              setPendingActions([]);
              reloadConversations();
              if (!activeId && conversationId) router.replace(`/chat?c=${conversationId}`);
              if (conversationId) void refreshConversation(conversationId);
              else {
                setStreamText("");
                reloadConversation();
              }
              break;
            case "error":
              finished = true;
              setError(event.message);
              setStreaming(false);
              setOptimisticUser(null);
              setStreamReasoning("");
              if (!activeId && conversationId) router.replace(`/chat?c=${conversationId}`);
              if (conversationId) void refreshConversation(conversationId);
              else {
                setStreamText("");
                reloadConversation();
              }
              break;
          }
        },
      });
      if (!finished) {
        setStreaming(false);
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setOptimisticUser(null);
        setStreamText("");
        setStreamReasoning("");
        reloadConversation();
        reloadConversations();
      } else {
        setError(errorMessage(err));
        setStreaming(false);
        setOptimisticUser(null);
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  };

  const autoQueryRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const query = searchParams.get("q")?.trim();
    if (!query || !modelId || streaming) return;
    if (autoQueryRef.current === query) return;
    autoQueryRef.current = query;
    void send(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, modelId, streaming]);

  const deleteConversation = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/conversations/${deleteTarget.id}`);
      toast.success("Conversation deleted");
      setConversationsData((prev) =>
        prev
          ? { conversations: prev.conversations.filter((c) => c.id !== deleteTarget.id) }
          : prev,
      );
      if (deleteTarget.id === activeId) {
        router.push("/chat");
      }
      setDeleteTarget(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const savePrompt = () => {
    setSystemPrompt(promptDraft);
    setPromptOpen(false);
    toast.success("System prompt updated", {
      description: promptDraft.trim() ? "Applied to your next message." : "Using the default prompt.",
    });
  };

  const filtered = (conversationsData?.conversations ?? []).filter((c) =>
    c.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const hasMessages =
    messages.length > 0 ||
    Boolean(optimisticUser) ||
    streaming ||
    pendingActions.length > 0 ||
    conversationLoading;
  const composerDisabled = models.length === 0;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close conversation list"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--sidebar))] transition-transform lg:static lg:z-0 lg:translate-x-0 lg:bg-transparent",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-12 items-center justify-between gap-2 border-b border-[hsl(var(--border))] px-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
            Conversations
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="secondary" onClick={() => { selectConversation(null); setSidebarOpen(false); }}>
              <Plus className="size-3.5" /> New
            </Button>
            <Button variant="ghost" size="icon" className="size-8 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close conversations">
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="border-b border-[hsl(var(--border))] p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations…"
              className="h-9 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-8 pr-2 text-[12px] outline-none focus:border-[hsl(var(--signal))]/60"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12px] text-[hsl(var(--muted-foreground))]">
              {search ? "No conversations match." : "No conversations yet."}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((conversation) => (
                <li key={conversation.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    className={cn(
                      "flex w-full items-start gap-2 border-l-2 py-2 pl-2 pr-8 text-left transition-colors",
                      conversation.id === activeId
                        ? "border-[hsl(var(--signal))] bg-[hsl(var(--signal))]/[0.06]"
                        : "border-transparent hover:bg-[hsl(var(--muted))]",
                    )}
                  >
                    <MessageSquare
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        conversation.id === activeId
                          ? "text-[hsl(var(--signal))]"
                          : "text-[hsl(var(--muted-foreground))]",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px]">{conversation.title}</span>
                      <span className="block text-[10.5px] text-[hsl(var(--muted-foreground))]">
                        {conversation.messageCount} msg · {timeAgo(conversation.updatedAt)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Delete conversation"
                    onClick={() => setDeleteTarget(conversation)}
                    className="absolute right-1.5 top-2.5 rounded p-1 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-[hsl(var(--border))] p-2">
          <Link
            href="/models"
            className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
          >
            <Zap className="size-3.5" />
            {models.length > 0 ? `${models.length} model${models.length === 1 ? "" : "s"} ready` : "Add a model"}
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-[hsl(var(--background))]">
        <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-[hsl(var(--border))] px-2 sm:gap-2 sm:px-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open conversations"
          >
            <PanelLeft className="size-4" />
          </Button>

          <div className="relative w-[148px] shrink-0 sm:w-[200px]">
            <Sparkles className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-[hsl(var(--signal))]" />
            <Select
              value={modelId ?? ""}
              onChange={(event) => selectModel(event.target.value)}
              className="h-8 w-full border-[hsl(var(--border))] bg-transparent pl-7 text-[11.5px] transition-colors hover:border-[hsl(var(--signal))]/50 sm:text-[12px]"
              disabled={models.length === 0}
              aria-label="Model"
            >
              {models.length === 0 ? <option value="">{modelsLoading ? "Loading…" : "No models"}</option> : null}
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="relative hidden w-[190px] sm:block">
            <FolderKanban className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Select
              value={projectId ?? ""}
              onChange={(event) => setProjectId(event.target.value || null)}
              className="h-8 w-full border-[hsl(var(--border))] bg-transparent pl-7 text-[12px] transition-colors hover:border-[hsl(var(--signal))]/50"
              aria-label="Project context"
            >
              <option value="">No project context</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Tooltip content="Agent mode can propose file edits. Nothing is written until you approve.">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-2 py-1.5 transition-colors hover:border-[hsl(var(--signal))]/40">
                <Bot className="size-3.5 text-[hsl(var(--muted-foreground))]" />
                <span className="hidden text-[11.5px] sm:inline">Agent</span>
                <Switch
                  checked={agentMode}
                  onCheckedChange={setAgentMode}
                  aria-label="Agent mode"
                  className="scale-75"
                />
              </label>
            </Tooltip>

            <Tooltip content="System prompt">
              <Button
                variant="ghost"
                size="icon"
                className="hidden size-8 sm:inline-flex"
                onClick={() => {
                  setPromptDraft(systemPrompt);
                  setPromptOpen(true);
                }}
                aria-label="System prompt"
              >
                <Settings2 className="size-4" />
              </Button>
            </Tooltip>

            <Button
              variant="ghost"
              size="icon"
              className="hidden size-8 sm:inline-flex"
              onClick={() => selectConversation(null)}
              aria-label="New chat"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
          ) : null}
          {!hasMessages ? (
            <div className="relative mx-auto flex min-h-full max-w-2xl flex-col justify-center px-4 py-6 sm:py-8">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                <span>New session</span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 bg-[hsl(var(--signal))]" />
                  Ready
                </span>
              </div>
              <div className="mt-6 flex animate-fade-up items-start gap-3 sm:mt-10 sm:gap-4">
                <div className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs">
                  <AstraMark className="size-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-balance text-[24px] font-semibold leading-[1.1] tracking-[-0.045em] sm:text-[31px]">
                    How can I help you build?
                  </h1>
                  <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                    Streaming chat with project context. Agent mode can propose file changes — nothing is written until you approve.
                  </p>
                </div>
              </div>

              {composerDisabled ? (
                <div className="mt-6 w-full animate-fade-up space-y-3 [animation-delay:90ms] sm:mt-8">
                  <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs">
                    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-[hsl(var(--signal))]" />
                    <div className="p-4 pl-5 sm:p-5 sm:pl-6">
                      <p className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                        <Zap className="size-3.5 text-[hsl(var(--signal))]" />
                        Connection required
                      </p>
                      <p className="mt-2 text-[14px] font-semibold">Bring your own model</p>
                      <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                        AstraCode works with any OpenAI-compatible API, Ollama, or a custom endpoint. Your keys stay on this machine.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {["Groq", "OpenRouter", "Ollama", "Custom"].map((provider) => (
                          <span key={provider} className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))]">
                            {provider}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Link href="/models" className={cn(buttonVariants({ size: "sm" }), "font-mono text-[10px] uppercase tracking-[0.08em]")}>
                          Open Model Hub
                        </Link>
                        <Link href="/docs#connect-a-model" className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))] underline-offset-4 transition-colors hover:text-[hsl(var(--foreground))] hover:underline">
                          Setup guide
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 p-1.5">
                    {[
                      { title: "Stream", detail: "SSE replies", icon: Zap },
                      { title: "Edit", detail: "Project files", icon: Code2 },
                      { title: "Approve", detail: "Agent actions", icon: Check },
                    ].map((item) => (
                      <div key={item.title} className="bg-[hsl(var(--card))] px-3 py-2.5">
                        <item.icon className="size-3.5 text-[hsl(var(--signal))]" />
                        <p className="mt-1.5 text-[11.5px] font-medium">{item.title}</p>
                        <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))]">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="stagger-fade mt-5 grid w-full gap-2 sm:mt-8 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion, index) => (
                    <button
                      key={suggestion.title}
                      type="button"
                      onClick={() => {
                        setInput(suggestion.prompt);
                        textareaRef.current?.focus();
                      }}
                      className="group grid grid-cols-[34px_1fr] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--signal))]/60 hover:bg-[hsl(var(--muted))]/30"
                    >
                      <span className="flex items-start justify-center border-r border-[hsl(var(--border))] pt-3 font-mono text-[10px] text-[hsl(var(--muted-foreground))] transition-colors group-hover:text-[hsl(var(--signal))]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="p-3">
                        <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
                          <suggestion.icon className="size-3.5 shrink-0 text-[hsl(var(--signal))]" />
                          {suggestion.title}
                        </span>
                        <span className="mt-1 block line-clamp-2 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                          {suggestion.prompt.replace(/```\n/g, "").slice(0, 90)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {presets.length > 0 && !composerDisabled ? (
                <div className="mt-4 flex w-full flex-wrap justify-center gap-1.5">
                  {presets.slice(0, 4).map((preset) => (
                    <Tooltip key={preset.id} content={preset.description}>
                      <button
                        type="button"
                        onClick={() => {
                          setSystemPrompt(preset.prompt);
                          toast.success(`Preset applied: ${preset.title}`);
                        }}
                        className="rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--signal))]/50 hover:text-[hsl(var(--foreground))]"
                      >
                        {preset.title}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 pb-8 pt-6">
              {conversationLoading && messages.length === 0 ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : null}

              <div className="space-y-6">
                {messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    projectId={projectId}
                    applied={applied}
                    onApplied={(index) =>
                      setApplied((prev) => new Set(prev).add(`${message.id}:${index}`))
                    }
                  />
                ))}

                {optimisticUser ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[hsl(var(--primary))] px-4 py-2.5 text-[13px] leading-relaxed text-[hsl(var(--primary-foreground))]">
                      <p className="whitespace-pre-wrap">{optimisticUser}</p>
                    </div>
                  </div>
                ) : null}

                {streaming || pendingActions.length > 0 ? (
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                      <AstraMark className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {streamReasoning ? (
                        <ReasoningPanel
                          text={streamReasoning}
                          streaming={streaming && !streamText}
                        />
                      ) : null}
                      {streamText ? (
                        <Markdown content={streamText} />
                      ) : streamReasoning ? null : (
                        <span className="inline-flex items-center gap-2 text-[12.5px] text-[hsl(var(--muted-foreground))]">
                          <LoaderCircle className="size-3.5 animate-spin" /> Thinking…
                        </span>
                      )}
                      {streaming ? (
                        <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-[hsl(var(--foreground))] align-middle" />
                      ) : null}
                      {pendingActions.map((action, index) => (
                        <AgentActionCard
                          key={`${action.op}:${action.path}:${index}`}
                          action={action}
                          projectId={projectId}
                          applied={false}
                          onApplied={() => undefined}
                        />
                      ))}
                      {!streaming && streamUsage ? (
                        <p className="mt-2 text-[10.5px] text-[hsl(var(--muted-foreground))]">
                          {streamUsage.inputTokens ?? "?"} in · {streamUsage.outputTokens ?? "?"} out ·{" "}
                          {streamUsage.source === "provider" ? "measured" : "estimated"}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-3xl px-4 py-3">
            {error ? (
              <div className="mb-2 rounded-lg border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8 px-3 py-2 text-[12px] text-[hsl(var(--destructive))]">
                {error}
              </div>
            ) : null}
            {agentMode ? (
              <div className="mb-2 flex items-center gap-1.5 text-[10.5px] text-[hsl(var(--muted-foreground))]">
                <Bot className="size-3 text-[hsl(var(--primary))]" />
                Agent mode · file changes require your approval
              </div>
            ) : null}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_18px_44px_-32px_hsl(var(--signal)/0.45)] transition-colors focus-within:border-[hsl(var(--signal))]/60">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  const target = event.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 180)}px`;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder={
                  composerDisabled
                    ? "Add a model to send messages…"
                    : "Ask Astra anything…"
                }
                disabled={composerDisabled}
                rows={1}
                className="min-h-0 max-h-[180px] resize-none border-0 bg-transparent px-3.5 pb-1 pt-3 text-[13.5px] focus-visible:ring-0"
              />
              <div className="flex items-center justify-between px-2.5 pb-2">
                <span className="max-w-[55%] truncate pl-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
                  {modelId ? models.find((m) => m.id === modelId)?.label ?? "" : "No model selected"}
                </span>
                {streaming ? (
                  <Button size="sm" variant="secondary" onClick={stop}>
                    <Square className="size-3 fill-current" /> Stop
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className="size-8 rounded-md"
                    onClick={() => void send()}
                    disabled={!input.trim() || composerDisabled}
                    aria-label="Send message"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-2 text-center font-mono text-[9.5px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
              Astra can make mistakes. Verify code before shipping.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>System prompt</DialogTitle>
            <DialogDescription>
              Instruction prepended to every message in this conversation. Leave empty to use the default Astra prompt.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={promptDraft}
            onChange={(event) => setPromptDraft(event.target.value)}
            rows={6}
            placeholder="You are a senior TypeScript engineer…"
            className="font-mono text-[12px]"
          />
          {presets.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                Installed presets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPromptDraft(preset.prompt)}
                    className="rounded-lg border border-[hsl(var(--border))] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors hover:border-[hsl(var(--signal))]/50 hover:bg-[hsl(var(--muted))]"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPromptOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePrompt}>
              <Check className="size-4" /> Save prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete conversation?"
        description={`“${deleteTarget?.title ?? ""}” and its messages will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        pending={deleting}
        onConfirm={deleteConversation}
      />
    </div>
  );
}

function ReasoningPanel({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/35 px-2.5 py-1.5 text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--signal))]/40 hover:text-[hsl(var(--foreground))]"
      >
        <Brain className="size-3.5 text-[hsl(var(--signal))]" />
        <span>Thought</span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))]/80">
          {streaming ? "thinking…" : `${words} ${words === 1 ? "word" : "words"}`}
        </span>
        <ChevronDown
          className={cn("size-3.5 transition-transform", open ? "rotate-180" : "")}
        />
      </button>
      {open ? (
        <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/35 px-3.5 py-3 text-[12px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          <p className="whitespace-pre-wrap">{text}</p>
          {streaming ? (
            <span className="mt-2 inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em]">
              <LoaderCircle className="size-3 animate-spin" /> still thinking
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MessageItem({
  message,
  projectId,
  applied,
  onApplied,
}: {
  message: MessageDto;
  projectId: string | null;
  applied: Set<string>;
  onApplied: (index: number) => void;
}) {
  if (message.role === "system") {
    return (
      <div className="border border-dashed border-[hsl(var(--border))] px-3 py-2 text-[11.5px] text-[hsl(var(--muted-foreground))]">
        {message.content}
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] items-start gap-2">
          <div className="max-w-full border border-[hsl(var(--signal))]/35 bg-[hsl(var(--signal))]/[0.07] px-3.5 py-2.5 text-[13px] leading-relaxed">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className="mt-0.5 hidden size-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] sm:flex">
            <User className="size-3.5" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <AstraMark className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="group/msg relative">
          {message.reasoning ? <ReasoningPanel text={message.reasoning} /> : null}
          <Markdown content={message.content} />
          <div className="mt-1 opacity-0 transition-opacity group-hover/msg:opacity-100">
            <CopyButton text={message.content} />
          </div>
        </div>
        {message.actions && message.actions.length > 0 ? (
          <div className="mt-1">
            {message.actions.map((action, index) => (
              <AgentActionCard
                key={`${action.op}:${action.path}:${index}`}
                action={action}
                projectId={projectId}
                applied={applied.has(`${message.id}:${index}`)}
                onApplied={() => onApplied(index)}
              />
            ))}
          </div>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10.5px] text-[hsl(var(--muted-foreground))]">
          {message.modelLabel ? <Badge variant="outline">{message.modelLabel}</Badge> : null}
          {message.tokensIn !== null || message.tokensOut !== null ? (
            <span>
              {message.tokensIn ?? "?"} in · {message.tokensOut ?? "?"} out
              {message.usageSource === "estimated" ? " (estimated)" : ""}
            </span>
          ) : null}
          {message.latencyMs !== null ? <span>{message.latencyMs} ms</span> : null}
          <span>{timeAgo(message.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
