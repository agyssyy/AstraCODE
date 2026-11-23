import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  Code2,
  Database,
  FlaskConical,
  FolderKanban,
  MessageSquare,
  Puzzle,
  Send,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Zap,
} from "lucide-react";
import { buttonVariants, cn } from "@astracode/ui";
import { Logo } from "@/components/brand/logo";
import { LandingHeader } from "@/components/marketing/landing-header";

const modules = [
  {
    icon: MessageSquare,
    title: "Astra AI",
    description: "Streaming chat with project context, history and an approval-gated agent.",
  },
  {
    icon: Code2,
    title: "Studio",
    description: "Monaco editor, file tree and a sandbox terminal with signed live preview.",
  },
  {
    icon: Boxes,
    title: "Model Hub",
    description: "OpenAI-compatible, Ollama or custom endpoints, keys encrypted at rest.",
  },
  {
    icon: Send,
    title: "API Center",
    description: "Compose requests, inspect headers and timing, replay any call.",
  },
  {
    icon: FolderKanban,
    title: "Projects",
    description: "Templates, import and export, portable `.astracode.json` bundles.",
  },
  {
    icon: FlaskConical,
    title: "Benchmark Lab",
    description: "Run coding suites across models and keep a latency and token leaderboard.",
  },
  {
    icon: Puzzle,
    title: "Extensions",
    description: "Prompt packs and project templates with explicit permissions.",
  },
  {
    icon: ShieldCheck,
    title: "Security",
    description: "Scrypt passwords, opaque sessions, origin checks and rate limits.",
  },
];

const providers = ["OpenAI-compatible", "Ollama", "Groq", "Cerebras", "OpenRouter", "OpenCode", "DeepSeek", "Mistral"];

const architecture = [
  {
    step: "01",
    title: "Web",
    subtitle: "Next.js · React · Tailwind",
    detail: "App router, server rendering, Monaco and SSE streaming.",
    icon: Code2,
  },
  {
    step: "02",
    title: "API",
    subtitle: "Fastify · TypeScript",
    detail: "REST, auth, rate limits, signed previews and provider proxy.",
    icon: TerminalSquare,
  },
  {
    step: "03",
    title: "Data",
    subtitle: "PostgreSQL · Drizzle",
    detail: "Typed schema, migrations and an embedded PGlite fallback.",
    icon: Database,
  },
];

const stats = [
  ["8", "modules"],
  ["1", "built-in model"],
  ["SSE", "streaming"],
  ["AES-256", "keys at rest"],
];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))] shadow-xs">
      <span className="size-1.5 rounded-full bg-[hsl(var(--signal))]" />
      {children}
    </p>
  );
}

function WorkspaceMock() {
  return (
    <div className="relative mx-auto mt-14 max-w-5xl px-px pb-1 sm:mt-20">
      <div
        aria-hidden="true"
        className="absolute -inset-x-12 -top-16 bottom-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--signal))_0%,transparent_65%)] opacity-[0.16] blur-3xl"
      />
      <div className="mock-float relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/90 backdrop-blur-xl">
        <div aria-hidden="true" className="mock-sheen" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--signal))]/70 to-transparent" />
        <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 px-4 py-3">
          <span className="size-2.5 rounded-full bg-[hsl(var(--destructive))]/70" />
          <span className="size-2.5 rounded-full bg-[hsl(var(--warning))]/70" />
          <span className="size-2.5 rounded-full bg-[hsl(var(--signal))]/80" />
          <span className="mx-auto inline-flex items-center gap-2 text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
            <span className="live-dot inline-block size-1.5 rounded-full bg-[hsl(var(--signal))] text-[hsl(var(--signal))]" />
            AstraCode — Workspace
          </span>
          <span className="hidden rounded-full border border-[hsl(var(--border))] px-2 py-0.5 text-[9px] text-[hsl(var(--muted-foreground))] sm:inline">
            live
          </span>
        </div>

        <div className="grid text-left sm:grid-cols-[190px_1fr]">
          <div className="hidden border-r border-[hsl(var(--border))] bg-[hsl(var(--sidebar))] p-3 sm:block">
            <p className="px-2 pb-2 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
              Explorer
            </p>
            {["app", "components", "lib", "package.json", "README.md"].map((file, index) => (
              <div
                key={file}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px]",
                  index === 2
                    ? "bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--muted-foreground))]",
                )}
              >
                <span className="size-1.5 rounded-full bg-current opacity-40" />
                {file}
              </div>
            ))}
            <div className="mt-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-medium">
                <Sparkles className="size-3 text-[hsl(var(--signal))]" />
                Astra Assistant
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                Included and ready. No setup.
              </p>
            </div>
          </div>

          <div className="flex min-h-[340px] min-w-0 flex-col">
            <div className="min-w-0 flex-1 space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11.5px] font-medium">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-[hsl(var(--signal))] text-[hsl(var(--signal-foreground))]">
                    <Sparkles className="size-3.5" />
                  </span>
                  Astra Assistant
                  <span className="rounded-full bg-[hsl(var(--accent))] px-2 py-0.5 text-[9.5px] font-medium text-[hsl(var(--signal))]">
                    Built in
                  </span>
                </div>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">just now</span>
              </div>

              <p className="max-w-lg text-[12.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                I refactored the auth guard and added streaming cancellation. Here is the changed
                route handler:
              </p>

              <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-3 py-1.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                  <span>apps/api/src/routes/chat.ts</span>
                  <span className="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5">TypeScript</span>
                </div>
                <pre className="overflow-x-auto p-3 font-mono text-[10.5px] leading-5 text-[hsl(var(--foreground))]">
{`export async function stream(req, reply) {
  const target = await resolveModel(req.body.modelId);
  reply.raw.setHeader("content-type", "text/event-stream");
  const stream = await complete(target, req.body);
  for await (const chunk of stream) reply.raw.write(chunk);
}`}
                </pre>
              </div>
            </div>

            <div className="border-t border-[hsl(var(--border))] p-3">
              <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 shadow-xs">
                <span className="flex-1 text-[11.5px] text-[hsl(var(--muted-foreground))]">
                  Ask anything about this project…
                </span>
                <span className="hidden rounded-md bg-[hsl(var(--muted))] px-2 py-1 text-[9.5px] font-medium text-[hsl(var(--muted-foreground))] sm:inline">
                  Astra Assistant
                </span>
                <span className="flex size-6 items-center justify-center rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                  <ArrowRight className="size-3" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mock-chip -left-10 top-[36%] hidden xl:flex" style={{ animationDelay: "-2s" }}>
        <span className="dot" />
        <span>Streaming</span>
        <strong>38 tok/s</strong>
      </div>
      <div className="mock-chip -right-10 top-[22%] hidden xl:flex" style={{ animationDelay: "-4s" }}>
        <ShieldCheck className="size-3.5 text-[hsl(var(--signal))]" />
        <span>Keys</span>
        <strong>AES-256</strong>
      </div>
      <div className="mock-chip -left-12 bottom-[16%] hidden xl:flex" style={{ animationDelay: "-1s" }}>
        <Sparkles className="size-3.5 text-[hsl(var(--violet))]" />
        <span>Assistant</span>
        <strong>ready</strong>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing dark min-h-dvh bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <LandingHeader />

      <main>
        <section className="relative isolate overflow-hidden border-b border-[hsl(var(--border))] px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
          <div aria-hidden="true" className="landing-aurora">
            <span className="a1" />
            <span className="a2" />
            <span className="a3" />
          </div>
          <div aria-hidden="true" className="grid-bg pointer-events-none absolute inset-0 opacity-70" />
          <div aria-hidden="true" className="landing-noise" />

          <div className="relative mx-auto max-w-[1120px] text-center">
            <div className="hero-rise">
              <Eyebrow>
                <span className="text-[hsl(var(--signal))]">New</span> · Astra Assistant included free
              </Eyebrow>
            </div>

            <h1 className="hero-rise mx-auto mt-7 max-w-4xl text-balance text-[44px] font-semibold leading-[0.98] tracking-[-0.06em] [animation-delay:90ms] sm:text-[72px] lg:text-[88px]">
              <span className="block">Build at the speed</span>
              <span className="hero-shine block pb-1">of thought.</span>
            </h1>

            <p className="hero-rise mx-auto mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-[hsl(var(--muted-foreground))] [animation-delay:180ms] sm:text-[17px]">
              The AI-native workspace for people who ship. Chat, code, run and benchmark in one
              place — with a built-in assistant, or the models you already use.
            </p>

            <div className="hero-rise mt-9 flex flex-col items-center justify-center gap-3 [animation-delay:260ms] sm:flex-row">
              <Link
                href="/register"
                className={cn(buttonVariants({ size: "lg" }), "cta-glow group h-12 w-full justify-center px-7 text-[14px] sm:w-auto")}
              >
                Start building free
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/docs"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "h-12 w-full justify-center px-7 text-[14px] hover:bg-[hsl(var(--card))] sm:w-auto",
                )}
              >
                Explore the docs
                <ArrowUpRight className="size-4" />
              </Link>
            </div>

            <div className="hero-rise mt-8 flex flex-wrap items-center justify-center gap-2 [animation-delay:340ms]">
              {[
                { label: "No provider setup", icon: Check },
                { label: "Open source", icon: Code2 },
                { label: "Self-host ready", icon: TerminalSquare },
                { label: "SSE streaming", icon: Zap },
              ].map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]/55 px-3 py-1.5 text-[11.5px] text-[hsl(var(--muted-foreground))] backdrop-blur-md"
                >
                  <Icon className="size-3.5 text-[hsl(var(--signal))]" />
                  {label}
                </span>
              ))}
            </div>

            <div className="hero-rise [animation-delay:420ms]">
              <WorkspaceMock />
            </div>
          </div>
        </section>

        <section className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/30 px-5 py-6 sm:px-8">
          <div className="mx-auto flex max-w-[1120px] flex-col items-center gap-3 sm:flex-row sm:gap-8">
            <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
              Works with
            </p>
            <div className="landing-fade-x relative w-full overflow-hidden">
              <div className="marquee-track flex w-max animate-marquee items-center gap-10 py-1">
                {[...providers, ...providers].map((provider, index) => (
                  <span
                    key={`${provider}-${index}`}
                    className="whitespace-nowrap text-[12px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
                  >
                    {provider}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="assistant" className="border-b border-[hsl(var(--border))] px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <Eyebrow>Built-in AI</Eyebrow>
              <h2 className="mt-5 text-balance text-[32px] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-[42px]">
                Your first conversation starts immediately.
              </h2>
              <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                Astra Assistant is part of the workspace, so there is no key to paste before you can
                think out loud. Bring your own OpenAI-compatible or Ollama endpoint whenever you
                want a different model — every provider sits side by side.
              </p>

              <ul className="mt-7 space-y-3">
                {[
                  "Streaming answers with conversation history",
                  "Project-aware context and an approval-gated agent",
                  "Encrypted keys for every endpoint you add",
                  "One shared default, switchable per conversation",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13.5px]">
                    <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--signal))]">
                      <Check className="size-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-2">
                <Link href="/register" className={buttonVariants({ size: "sm" })}>
                  Try Astra Assistant
                </Link>
                <Link href="/docs" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  How it works
                </Link>
              </div>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-4 bg-[radial-gradient(ellipse_at_center,hsl(var(--signal))_0%,transparent_70%)] opacity-[0.08] blur-2xl sm:-inset-6"
              />
              <div className="relative grid gap-3">
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-[hsl(var(--signal))] text-[hsl(var(--signal-foreground))]">
                        <Sparkles className="size-3.5" />
                      </span>
                      <div>
                        <p className="text-[12.5px] font-semibold">Astra Assistant</p>
                        <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">Included · default</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[hsl(var(--success))]/12 px-2 py-0.5 text-[9.5px] font-medium text-[hsl(var(--success))]">
                      Ready
                    </span>
                  </div>
                  <div className="mt-3 rounded-lg bg-[hsl(var(--muted))]/60 p-3 text-[11.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                    Write a migration that adds soft deletes to projects, then update the routes.
                  </div>
                  <div className="mt-2 ml-6 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-[11.5px] leading-relaxed">
                    I added <code className="rounded bg-[hsl(var(--muted))] px-1 font-mono text-[10.5px]">deletedAt</code>, wrote the migration and
                    filtered every project query. Want me to apply it?
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="size-3.5 text-[hsl(var(--signal))]" />
                      <p className="text-[12px] font-semibold">No setup</p>
                    </div>
                    <p className="mt-1.5 text-[10.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                      Sign up and send a message. No billing screen in the way.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-3.5 text-[hsl(var(--signal))]" />
                      <p className="text-[12px] font-semibold">Bring your own</p>
                    </div>
                    <p className="mt-1.5 text-[10.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                      Add OpenAI, Ollama or any compatible endpoint later.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="border-b border-[hsl(var(--border))] px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-[1120px]">
            <div className="max-w-2xl">
              <Eyebrow>The platform</Eyebrow>
              <h2 className="mt-5 text-balance text-[32px] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-[42px]">
                Eight instruments. One workspace.
              </h2>
              <p className="mt-4 text-[14.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                Every module has a real backend, real data, and honest loading, empty and error
                states.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {modules.map((module) => (
                <div
                  key={module.title}
                  className="group rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors group-hover:bg-[hsl(var(--accent))] group-hover:text-[hsl(var(--signal))]">
                    <module.icon className="size-[18px]" />
                  </span>
                  <h3 className="mt-4 text-[13.5px] font-semibold">{module.title}</h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                    {module.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-col items-start justify-between gap-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xs sm:flex-row sm:items-center">
              <div>
                <p className="text-[13.5px] font-semibold">The whole stack is open.</p>
                <p className="mt-1 text-[12.5px] text-[hsl(var(--muted-foreground))]">
                  API, database schema and component system — read it, extend it, self-host it.
                </p>
              </div>
              <Link href="/docs" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0")}>
                Browse the source
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <section id="architecture" className="border-b border-[hsl(var(--border))] px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-[1120px]">
            <div className="max-w-2xl">
              <Eyebrow>Architecture</Eyebrow>
              <h2 className="mt-5 text-balance text-[32px] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-[42px]">
                One request, traced end to end.
              </h2>
              <p className="mt-4 text-[14.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                A typed monorepo from the browser to the database, with a provider adapter layer in
                the middle.
              </p>
            </div>

            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {architecture.map((layer) => (
                <div
                  key={layer.title}
                  className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-[hsl(var(--accent))] text-[hsl(var(--signal))]">
                      <layer.icon className="size-[18px]" />
                    </span>
                    <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
                      {layer.step}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[15px] font-semibold">{layer.title}</h3>
                  <p className="mt-1 text-[11.5px] font-medium text-[hsl(var(--muted-foreground))]">
                    {layer.subtitle}
                  </p>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                    {layer.detail}
                  </p>
                </div>
              ))}
            </div>

            <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--border))] sm:grid-cols-4">
              {stats.map(([value, label]) => (
                <div key={label} className="bg-[hsl(var(--card))] px-5 py-4">
                  <dd className="text-[20px] font-semibold tracking-[-0.03em]">{value}</dd>
                  <dt className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="open-source" className="border-b border-[hsl(var(--border))] px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
            <div>
              <Eyebrow>Open source</Eyebrow>
              <h2 className="mt-5 text-balance text-[32px] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-[42px]">
                Run it locally in three commands.
              </h2>
              <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                Apache-2.0, no telemetry, no license key. The web app, API, shared packages and
                database schema are all in one pnpm workspace.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/docs" className={buttonVariants({ size: "sm" })}>
                  Read the setup guide
                  <ArrowRight className="size-3.5" />
                </Link>
                <Link href="/register" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Use the hosted app
                </Link>
              </div>
              <p className="mt-4 text-[11px] text-[hsl(var(--muted-foreground))]">
                Requires Node 20+ and pnpm 9.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-md">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-2.5">
                <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">Terminal</span>
                <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[9.5px] text-[hsl(var(--muted-foreground))]">
                  bash
                </span>
              </div>
              <div className="space-y-2 p-5 font-mono text-[12px] leading-6">
                <p>
                  <span className="mr-2 select-none text-[hsl(var(--signal))]">$</span>
                  pnpm install
                </p>
                <p>
                  <span className="mr-2 select-none text-[hsl(var(--signal))]">$</span>
                  pnpm db:migrate
                </p>
                <p>
                  <span className="mr-2 select-none text-[hsl(var(--signal))]">$</span>
                  pnpm dev
                </p>
                <p className="pt-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                  → web http://localhost:3000 · api http://localhost:4000
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-24">
          <div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-12 text-center shadow-sm sm:px-12 sm:py-16">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,hsl(var(--signal))_0%,transparent_70%)] opacity-[0.12]"
            />
            <div className="relative">
              <Logo size={28} className="mx-auto" />
              <h2 className="mx-auto mt-5 max-w-xl text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.045em] sm:text-[38px]">
                Your next project is one message away.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                Start with Astra Assistant, then add the models and tools that fit how you work.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
                <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "w-full justify-center sm:w-auto")}>
                  Create a free account
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="/login" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full justify-center sm:w-auto")}>
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[hsl(var(--border))]">
        <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Logo size={24} />
              <p className="mt-2 text-[11.5px] text-[hsl(var(--muted-foreground))]">
                Build beyond limits. Local-first, open source.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[hsl(var(--muted-foreground))]">
              <Link href="/docs" className="transition-colors hover:text-[hsl(var(--foreground))]">
                Docs
              </Link>
              <Link href="/login" className="transition-colors hover:text-[hsl(var(--foreground))]">
                Sign in
              </Link>
              <a href="#platform" className="transition-colors hover:text-[hsl(var(--foreground))]">
                Platform
              </a>
              <span>Apache-2.0</span>
              <span>2026</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
