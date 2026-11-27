import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  Circle,
  Code2,
  FlaskConical,
  FolderKanban,
  Github,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { buttonVariants, cn } from "@astracode/ui";
import { getStats, requireUser } from "@/lib/server";
import { formatNumber, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

function PanelHeader({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 border-b border-[hsl(var(--border))] px-4 py-2">
      <div className="min-w-0">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
          {label}
        </p>
        {children}
      </div>
      {action}
    </div>
  );
}

export default async function DashboardPage() {
  const [me, stats] = await Promise.all([requireUser(), getStats()]);
  const firstName = me.user.name.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const checklist = [
    {
      done: (stats?.providers ?? 0) > 0,
      title: "Connect a provider",
      description: "OpenAI-compatible, Ollama or custom.",
      href: "/providers",
    },
    {
      done: (stats?.models ?? 0) > 0,
      title: "Pin a default model",
      description: "Used by new chats and the agent.",
      href: "/models",
    },
    {
      done: (stats?.projects ?? 0) > 0,
      title: "Create a project",
      description: "Start blank or from a template.",
      href: "/projects",
    },
    {
      done: (stats?.conversations ?? 0) > 0,
      title: "Ask Astra",
      description: "Chat with project context.",
      href: "/chat",
    },
  ];
  const completed = checklist.filter((item) => item.done).length;
  const ready = Boolean(stats?.defaultModel);
  const githubUrl =
    process.env.NEXT_PUBLIC_GITHUB_URL ||
    process.env.GITHUB_URL ||
    "https://github.com/agyssyy/AstraCODE";

  const quickLinks = [
    { href: "/chat", label: "New conversation", icon: MessageSquare, note: "stream" },
    { href: "/studio", label: "Open Studio", icon: Code2, note: "edit" },
    { href: "/benchmark", label: "Run benchmark", icon: FlaskConical, note: "measure" },
    { href: "/api", label: "API Center", icon: Send, note: "request" },
  ];

  return (
    <div className="space-y-8">
      <header className="glass-panel glass-sheen relative flex flex-col gap-6 overflow-hidden rounded-[30px] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 size-72 rounded-full bg-[hsl(var(--iris)/0.2)] blur-3xl"
        />
        <div className="relative">
          <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
            <span className="size-1.5 bg-[hsl(var(--signal))]" />
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            <span className="mx-1 h-px w-6 bg-[hsl(var(--border))]" />
            WORKSPACE / 01
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-none tracking-[-0.045em] sm:text-[2.6rem]">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            {ready
              ? "The workspace is online. Pick up a project, open a conversation or run a measurement."
              : "Connect a provider and pin a model to unlock Astra AI, Studio and benchmarks."}
          </p>
          <form
            action="/chat"
            method="get"
            className="glass-panel mt-5 flex max-w-xl items-center gap-2 rounded-[20px] p-1.5 focus-within:border-[hsl(var(--signal))]/60"
          >
            <Sparkles className="ml-2.5 size-4 shrink-0 text-[hsl(var(--signal))]" />
            <input
              name="q"
              required
              autoComplete="off"
              placeholder="Ask Astra anything…"
              className="h-10 min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
            />
            <button
              type="submit"
              aria-label="Send message"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--signal))] to-[hsl(var(--violet))] text-[hsl(var(--signal-foreground))] transition-transform active:scale-95"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
        <div className="relative flex flex-wrap gap-2">
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open source on GitHub"
            title="AstraCode is open source — view the repository on GitHub"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "font-mono text-[10px] uppercase tracking-[0.08em]",
            )}
          >
            <Github className="size-3.5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <Link
            href="/studio"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "font-mono text-[10px] uppercase tracking-[0.08em]",
            )}
          >
            <Code2 className="size-3.5" /> Studio
          </Link>
          <Link
            href="/chat"
            className={cn(buttonVariants({ size: "sm" }), "font-mono text-[10px] uppercase tracking-[0.08em]")}
          >
            <Plus className="size-3.5" /> New chat
          </Link>
        </div>
      </header>

      <section aria-label="Workspace overview" className="glass-panel glass-sheen stagger-fade overflow-hidden rounded-[24px]">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-2">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
            SYSTEM / OVERVIEW
          </p>
          <p className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
            <span className={cn("size-1.5", ready ? "bg-[hsl(var(--signal))]" : "bg-[hsl(var(--warning))]")} />
            {ready ? "AI READY" : "SETUP REQUIRED"}
            <span className="ml-2 hidden border-l border-[hsl(var(--border))] pl-2 sm:inline">
              {stats?.databaseDriver === "postgres" ? "POSTGRES" : "PGLITE"}
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Projects", value: stats?.projects ?? 0, icon: FolderKanban, href: "/projects" },
            { label: "Conversations", value: stats?.conversations ?? 0, icon: MessageSquare, href: "/chat" },
            { label: "Models", value: stats?.models ?? 0, icon: Boxes, href: "/models" },
            { label: "Benchmark runs", value: stats?.benchmarkRuns ?? 0, icon: FlaskConical, href: "/benchmark" },
          ].map((stat, index) => (
            <Link
              key={stat.label}
              href={stat.href}
              className={cn(
                "group relative flex flex-col justify-between gap-5 p-4 transition-colors hover:bg-[hsl(var(--muted))]/60 sm:p-5",
                index % 2 === 1 && "border-l border-[hsl(var(--border))]",
                index >= 2 && "border-t border-[hsl(var(--border))] lg:border-t-0",
                index > 0 && "lg:border-l lg:border-[hsl(var(--border))]",
              )}
            >
              <span className="flex items-center justify-between font-mono text-[8.5px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
                {stat.label}
                <stat.icon className="size-3.5 transition-colors group-hover:text-[hsl(var(--signal))]" />
              </span>
              <span className="flex items-end justify-between gap-2">
                <span
                  className={cn(
                    "font-mono text-[1.6rem] font-medium leading-none tracking-[-0.05em] tabular-nums sm:text-[1.9rem]",
                    stat.value === 0 ? "text-[hsl(var(--muted-foreground))]/60" : "text-[hsl(var(--foreground))]",
                  )}
                >
                  {formatNumber(stat.value)}
                </span>
                <ArrowUpRight className="mb-0.5 size-4 text-[hsl(var(--muted-foreground))] opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:text-[hsl(var(--signal))] group-hover:opacity-100" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="stagger-fade grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="min-w-0 space-y-6">
          <section className="glass-panel glass-sheen rounded-[24px]">
            <PanelHeader
              label="PROJECTS / RECENT"
              action={
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
                >
                  All <ArrowRight className="size-3" />
                </Link>
              }
            >
              <p className="mt-0.5 text-[13px] font-medium">Recent projects</p>
            </PanelHeader>
            {stats && stats.recentProjects.length > 0 ? (
              <ul className="divide-y divide-[hsl(var(--border))]">
                {stats.recentProjects.map((project, index) => (
                  <li key={project.id}>
                    <Link
                      href={`/studio?project=${project.id}`}
                      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[hsl(var(--muted))]/50"
                    >
                      <span className="w-5 shrink-0 font-mono text-[9px] text-[hsl(var(--muted-foreground))]/60">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] transition-colors group-hover:border-[hsl(var(--signal))]/40 group-hover:text-[hsl(var(--signal))]">
                        <Code2 className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{project.name}</span>
                        <span className="block truncate font-mono text-[9.5px] uppercase tracking-[0.04em] text-[hsl(var(--muted-foreground))]">
                          {project.fileCount} files · {timeAgo(project.updatedAt)}
                        </span>
                      </span>
                      <span className="hidden rounded-md border border-[hsl(var(--border))] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-[hsl(var(--muted-foreground))] sm:inline">
                        {project.language}
                      </span>
                      <ArrowUpRight className="size-3.5 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <FolderKanban className="size-5 text-[hsl(var(--muted-foreground))]" />
                <p className="mt-2 text-[13px] font-medium">No projects yet</p>
                <p className="mt-1 max-w-xs text-[12px] text-[hsl(var(--muted-foreground))]">
                  Create a project to start editing, running and previewing code.
                </p>
                <Link
                  href="/projects"
                  className={cn(buttonVariants({ size: "sm" }), "mt-4 font-mono text-[10px] uppercase")}
                >
                  <Plus className="size-3.5" /> New project
                </Link>
              </div>
            )}
          </section>

          <section className="glass-panel glass-sheen rounded-[24px]">
            <PanelHeader
              label="ASTRA / THREADS"
              action={
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
                >
                  Open chat <ArrowRight className="size-3" />
                </Link>
              }
            >
              <p className="mt-0.5 text-[13px] font-medium">Recent conversations</p>
            </PanelHeader>
            {stats && stats.recentConversations.length > 0 ? (
              <ul className="divide-y divide-[hsl(var(--border))]">
                {stats.recentConversations.map((conversation) => (
                  <li key={conversation.id}>
                    <Link
                      href={`/chat?c=${conversation.id}`}
                      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[hsl(var(--muted))]/50"
                    >
                      <MessageSquare className="size-3.5 shrink-0 text-[hsl(var(--muted-foreground))] transition-colors group-hover:text-[hsl(var(--signal))]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px]">{conversation.title}</span>
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.04em] text-[hsl(var(--muted-foreground))]">
                          {conversation.messageCount} messages · {timeAgo(conversation.updatedAt)}
                        </span>
                      </span>
                      <ArrowUpRight className="size-3.5 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <Sparkles className="size-5 text-[hsl(var(--muted-foreground))]" />
                <p className="mt-2 text-[13px] font-medium">No conversations yet</p>
                <p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">
                  Ask Astra to explain an error or generate a function.
                </p>
                <Link
                  href="/chat"
                  className={cn(buttonVariants({ size: "sm" }), "mt-4 font-mono text-[10px] uppercase")}
                >
                  Start a chat
                </Link>
              </div>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <section className="glass-panel glass-sheen rounded-[24px]">
            <div className="border-b border-[hsl(var(--border))] p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                  BOOT SEQUENCE
                </p>
                <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
                  {completed}/{checklist.length}
                </span>
              </div>
              <div className="mt-3 h-1 w-full bg-[hsl(var(--muted))]">
                <div
                  className="h-1 bg-[hsl(var(--signal))] transition-[width]"
                  style={{ width: `${(completed / checklist.length) * 100}%` }}
                />
              </div>
            </div>
            <ul className="divide-y divide-[hsl(var(--border))]">
              {checklist.map((item, index) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[hsl(var(--muted))]/50"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center border",
                        item.done
                          ? "border-[hsl(var(--signal))] bg-[hsl(var(--signal))] text-[hsl(var(--signal-foreground))]"
                          : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]",
                      )}
                    >
                      {item.done ? <Check className="size-2.5" /> : <Circle className="size-1.5 fill-current" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[12.5px] font-medium",
                          item.done && "text-[hsl(var(--muted-foreground))] line-through decoration-[hsl(var(--border))]",
                        )}
                      >
                        {item.title}
                      </span>
                      <span className="block text-[11px] text-[hsl(var(--muted-foreground))]">
                        {item.description}
                      </span>
                    </span>
                    <span className="mt-0.5 font-mono text-[8.5px] text-[hsl(var(--muted-foreground))]/60">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-panel glass-sheen rounded-[24px]">
            <PanelHeader label="INFERENCE / DEFAULT" />
            <div className="p-4">
              {stats?.defaultModel ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--signal))]">
                      <Sparkles className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium">{stats.defaultModel.label}</p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-[hsl(var(--muted-foreground))]">
                        KEY ENCRYPTED · READY
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[hsl(var(--signal))]">
                    <span className="size-1.5 bg-[hsl(var(--signal))]" />
                    ON
                  </span>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-[12.5px] text-[hsl(var(--muted-foreground))]">
                    No default model selected.
                  </p>
                  <Link
                    href="/models"
                    className={cn(buttonVariants({ size: "sm" }), "mt-3 font-mono text-[10px] uppercase")}
                  >
                    Open Model Hub
                  </Link>
                </div>
              )}
            </div>
          </section>

        </div>
        <section className="glass-panel glass-sheen overflow-hidden rounded-[24px] xl:col-span-2">
          <div className="flex h-9 items-center justify-between border-b border-[hsl(var(--border))] px-4">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
              QUICK LAUNCH
            </p>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]/60">
              04 / ACTIONS
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {quickLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[hsl(var(--muted))]/50",
                  index % 2 === 1 && "border-l border-[hsl(var(--border))]",
                  index >= 2 && "border-t border-[hsl(var(--border))] sm:border-t-0",
                  index > 0 && "sm:border-l sm:border-[hsl(var(--border))]",
                )}
              >
                <span className="flex size-7 shrink-0 items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--signal))]">
                  <link.icon className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-medium leading-tight">{link.label}</span>
                  <span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]/70">
                    {link.note}
                  </span>
                </span>
                <ArrowUpRight className="ml-auto size-3.5 shrink-0 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
