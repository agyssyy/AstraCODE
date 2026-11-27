import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronRight,
  CircleDot,
  Code2,
  Database,
  FlaskConical,
  FolderKanban,
  KeyRound,
  Layers3,
  MessageSquare,
  MousePointer2,
  Puzzle,
  Send,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Waves,
  Zap,
} from "lucide-react";
import { buttonVariants, cn } from "@astracode/ui";
import { Logo } from "@/components/brand/logo";
import { LandingHeader } from "@/components/marketing/landing-header";
import { LandingMotion } from "@/components/marketing/landing-motion";
import { MotionCard } from "@/components/marketing/motion-card";
import { TypingHeadline } from "@/components/marketing/typing-headline";

const accents = {
  aqua: {
    icon: "text-[hsl(var(--signal))]",
    dot: "bg-[hsl(var(--signal))] shadow-[0_0_12px_hsl(var(--signal)/0.8)]",
    glow: "from-[hsl(var(--signal))]/18",
  },
  iris: {
    icon: "text-[hsl(var(--violet))]",
    dot: "bg-[hsl(var(--violet))] shadow-[0_0_12px_hsl(var(--violet)/0.8)]",
    glow: "from-[hsl(var(--violet))]/18",
  },
  mint: {
    icon: "text-[hsl(var(--mint))]",
    dot: "bg-[hsl(var(--mint))] shadow-[0_0_12px_hsl(var(--mint)/0.8)]",
    glow: "from-[hsl(var(--mint))]/18",
  },
  blush: {
    icon: "text-[hsl(var(--rose))]",
    dot: "bg-[hsl(var(--rose))] shadow-[0_0_12px_hsl(var(--rose)/0.8)]",
    glow: "from-[hsl(var(--rose))]/18",
  },
} as const;

type Accent = keyof typeof accents;

const modules: {
  icon: typeof MessageSquare;
  title: string;
  description: string;
  accent: Accent;
  span: string;
  featured?: boolean;
}[] = [
  {
    icon: MessageSquare,
    title: "Astra AI",
    description: "Streaming chat that keeps project context and asks before it writes.",
    accent: "aqua",
    span: "md:col-span-4 md:row-span-2",
    featured: true,
  },
  {
    icon: Code2,
    title: "Studio",
    description: "A browser IDE with a real file tree, Monaco editor and signed previews.",
    accent: "iris",
    span: "md:col-span-2",
  },
  {
    icon: Boxes,
    title: "Model Hub",
    description: "Bring OpenAI-compatible, Ollama or custom endpoints. Keys stay encrypted.",
    accent: "mint",
    span: "md:col-span-2",
  },
  {
    icon: Send,
    title: "API Center",
    description: "Compose, inspect and replay requests without leaving the workspace.",
    accent: "blush",
    span: "md:col-span-3",
  },
  {
    icon: FolderKanban,
    title: "Projects",
    description: "Templates, imports and portable bundles built for moving between machines.",
    accent: "aqua",
    span: "md:col-span-3",
  },
  {
    icon: FlaskConical,
    title: "Benchmark Lab",
    description: "Compare models on latency, tokens and real coding suites.",
    accent: "iris",
    span: "md:col-span-3",
  },
  {
    icon: Puzzle,
    title: "Extensions",
    description: "Prompt packs and templates with permissions you can read.",
    accent: "mint",
    span: "md:col-span-3",
  },
];

const flow = [
  {
    icon: MessageSquare,
    title: "Ask",
    detail: "Start in natural language. Astra reads the project before it answers.",
    accent: "aqua" as const,
  },
  {
    icon: Code2,
    title: "Shape",
    detail: "Review a concrete patch in Studio. Nothing is written without approval.",
    accent: "iris" as const,
  },
  {
    icon: TerminalSquare,
    title: "Run",
    detail: "Execute in a sandbox and open a signed preview in the same shell.",
    accent: "mint" as const,
  },
  {
    icon: FlaskConical,
    title: "Measure",
    detail: "Benchmark the result and keep the numbers next to the work.",
    accent: "blush" as const,
  },
];

const providers = [
  "DeepSeek",
  "OpenAI",
  "Ollama",
  "Groq",
  "Cerebras",
  "OpenRouter",
  "Mistral",
  "OpenCode",
];

const modelRows = [
  { name: "DeepSeek V4.1 Flash", meta: "built in · free", accent: "aqua" as const },
  { name: "DeepSeek Reasoner", meta: "reasoning stream", accent: "iris" as const },
  { name: "Your OpenAI key", meta: "encrypted at rest", accent: "mint" as const },
  { name: "Local Ollama", meta: "no cloud required", accent: "blush" as const },
];

const layers = [
  {
    icon: Layers3,
    title: "Web",
    detail: "Next.js, React, Monaco and server-sent events in one responsive shell.",
    accent: "aqua" as const,
  },
  {
    icon: TerminalSquare,
    title: "API",
    detail: "Fastify routes, opaque sessions, rate limits and a provider proxy.",
    accent: "iris" as const,
  },
  {
    icon: Database,
    title: "Data",
    detail: "Drizzle over PostgreSQL, with an embedded PGlite fallback for local runs.",
    accent: "mint" as const,
  },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="glass-pill inline-flex items-center gap-2 px-3 py-1.5 text-[10.5px] font-medium text-[hsl(var(--muted-foreground))]">
      <span className={cn("size-1.5 rounded-full", accents.aqua.dot)} />
      {children}
    </span>
  );
}

function HeroConsole() {
  return (
    <div className="mock-stage relative mx-auto w-full max-w-[620px] lg:mx-0 lg:max-w-none">
      <div
        aria-hidden="true"
        className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,hsl(190_100%_58%/0.22),hsl(258_90%_68%/0.12),transparent_72%)] blur-3xl"
      />
      <div className="deck-shell mock-float overflow-hidden">
        <div className="deck-top flex items-center gap-2 px-3 py-2.5 sm:px-4">
          <span className={cn("size-2 rounded-full", accents.blush.dot)} />
          <span className={cn("size-2 rounded-full", accents.iris.dot)} />
          <span className={cn("size-2 rounded-full", accents.mint.dot)} />
          <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">
            <span className="live-dot size-1.5 rounded-full bg-[hsl(var(--mint))] text-[hsl(var(--mint))]" />
            workspace / live
          </span>
          <span className="hidden rounded-full border border-white/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-white/35 sm:inline">
            local
          </span>
        </div>

        <div className="grid text-left sm:grid-cols-[1fr_180px]">
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex justify-end">
              <div className="deck-bubble deck-bubble-signal max-w-[86%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[11.5px] leading-relaxed text-white/85">
                Benchmark DeepSeek against the built-in model and keep my default unchanged.
              </div>
            </div>

            <div className="flex gap-2.5">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
                <Sparkles className={cn("size-3.5", accents.aqua.icon)} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="deck-bubble rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[11.5px] leading-relaxed text-white/75">
                  Added the endpoint, verified the key and queued two suites. Your default model is
                  untouched.
                </div>
                <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/25">
                  <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-1.5">
                    <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
                      providers.ts
                    </span>
                    <span className="text-[9px] text-[hsl(var(--mint))]">verified · 212ms</span>
                  </div>
                  <pre className="overflow-x-auto p-3 font-mono text-[9.5px] leading-relaxed text-white/50">
{`+ provider: "deepseek"
+ baseUrl:  "api.deepseek.com/v1"
+ status:   "healthy"`}
                  </pre>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["Approve write", "Open Studio", "Run benchmark"].map((chip, index) => (
                    <span
                      key={chip}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[9px]",
                        index === 0
                          ? "border-[hsl(var(--signal))]/35 bg-[hsl(var(--signal))]/15 text-[hsl(var(--signal))]"
                          : "border-white/10 bg-white/[0.04] text-white/45",
                      )}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-[10px] text-white/35">
              <span className={cn("size-1.5 rounded-full", accents.aqua.dot)} />
              Ask Astra anything…
              <span className="ml-auto rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[8px]">
                ⌘K
              </span>
            </div>
          </div>

          <div className="hidden border-l border-white/[0.07] bg-black/10 p-3 sm:block">
            <p className="px-1 pb-2 font-mono text-[8px] uppercase tracking-[0.18em] text-white/30">
              Context
            </p>
            <div className="space-y-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.045] p-2.5">
                <div className="flex items-center gap-1.5 text-[9px] text-white/40">
                  <Boxes className={cn("size-3", accents.iris.icon)} /> Provider
                </div>
                <p className="mt-1 text-[11px] font-medium text-white/80">DeepSeek</p>
                <p className="mt-0.5 font-mono text-[8px] text-white/30">v4.1 flash</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.045] p-2.5">
                <div className="flex items-center gap-1.5 text-[9px] text-white/40">
                  <Zap className={cn("size-3", accents.aqua.icon)} /> Latency
                </div>
                <p className="mt-1 text-[16px] font-semibold tracking-tight text-white/85">
                  212<span className="ml-0.5 text-[9px] font-normal text-white/35">ms</span>
                </p>
                <div className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-white/10">
                  <span className="w-[28%] bg-[hsl(var(--mint))]" />
                  <span className="w-[44%] bg-[hsl(var(--signal))]" />
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.045] p-2.5">
                <div className="flex items-center gap-1.5 text-[9px] text-white/40">
                  <KeyRound className={cn("size-3", accents.mint.icon)} /> Keys
                </div>
                <p className="mt-1 text-[10.5px] text-white/65">AES-256-GCM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="deck-chip absolute -left-3 top-[28%] hidden items-center gap-2 rounded-2xl px-3 py-2 text-[10px] text-white/55 lg:flex xl:-left-10">
        <span className={cn("size-1.5 rounded-full", accents.mint.dot)} />
        Streaming <strong className="font-medium text-white/85">38 tok/s</strong>
      </div>
      <div className="deck-chip absolute -right-3 top-[16%] hidden items-center gap-2 rounded-2xl px-3 py-2 text-[10px] text-white/55 lg:flex xl:-right-10">
        <ShieldCheck className={cn("size-3.5", accents.blush.icon)} />
        <strong className="font-medium text-white/85">Approval</strong> gates writes
      </div>
      <div className="deck-chip absolute -left-2 bottom-[12%] hidden items-center gap-2 rounded-2xl px-3 py-2 text-[10px] text-white/55 lg:flex xl:-left-8">
        <Sparkles className={cn("size-3.5", accents.iris.icon)} />
        <strong className="font-medium text-white/85">3</strong> providers healthy
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing min-h-dvh text-[hsl(var(--foreground))]">
      <LandingHeader />
      <LandingMotion />

      <main>
        <section className="relative isolate overflow-hidden px-5 pb-24 pt-12 sm:px-8 sm:pb-28 sm:pt-16 lg:pt-20">
          <div aria-hidden="true" className="landing-aurora">
            <span className="a1" />
            <span className="a2" />
            <span className="a3" />
          </div>
          <div aria-hidden="true" className="glass-grid-line pointer-events-none absolute inset-0" />
          <div aria-hidden="true" className="landing-noise" />

          <div className="relative mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[0.94fr_1.06fr] lg:gap-12">
            <div>
              <div className="hero-rise flex items-center gap-3">
                <Eyebrow>Astra Assistant is included</Eyebrow>
                <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-white/25 sm:inline">
                  v0.1 · open source
                </span>
              </div>

              <h1 className="hero-rise mt-7 text-[46px] font-semibold leading-[0.95] tracking-[-0.065em] [--rise-delay:90ms] sm:text-[72px] lg:text-[86px]">
                <span className="block">Build at the</span>
                <span className="solar-text block min-h-[1.05em] pb-1">
                  <TypingHeadline
                    phrases={[
                      "speed of thought.",
                      "pace you ship.",
                      "models you trust.",
                      "edge of possible.",
                    ]}
                  />
                </span>
              </h1>

              <p className="hero-rise mt-6 max-w-xl text-pretty text-[14.5px] leading-relaxed text-[hsl(var(--muted-foreground))] [--rise-delay:170ms] sm:text-[16px]">
                One liquid workspace for chat, code, run and benchmark. Start with Astra Assistant —
                a free built-in model — then plug in every endpoint you already pay for.
              </p>

              <div className="hero-rise mt-9 flex flex-col gap-2.5 [--rise-delay:250ms] sm:flex-row">
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "cta-glow group h-12 justify-center rounded-full px-7 text-[13.5px] sm:w-auto",
                  )}
                >
                  Start building free
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/docs"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                    "glass-pill h-12 justify-center rounded-full border-0 px-7 text-[13.5px] hover:bg-white/10 sm:w-auto",
                  )}
                >
                  Read the docs
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>

              <div className="hero-rise mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-white/40 [--rise-delay:330ms]">
                {["No provider setup", "Open source", "Self-host ready", "SSE streaming"].map(
                  (label) => (
                    <span key={label} className="inline-flex items-center gap-1.5">
                      <Check className={cn("size-3", accents.mint.icon)} />
                      {label}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="hero-rise [--rise-delay:420ms]">
              <HeroConsole />
            </div>
          </div>
        </section>

        <section className="relative border-y border-white/[0.06] bg-white/[0.025] px-5 py-5 backdrop-blur-xl sm:px-8">
          <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-3 sm:flex-row sm:gap-8">
            <p className="shrink-0 font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">
              Connect anything
            </p>
            <div className="landing-fade-x relative w-full overflow-hidden">
              <div className="marquee-track flex w-max animate-marquee items-center gap-10 py-1">
                {[...providers, ...providers].map((provider, index) => (
                  <span
                    key={`${provider}-${index}`}
                    className="whitespace-nowrap text-[11.5px] font-medium text-white/40 transition-colors hover:text-white/85"
                  >
                    {provider}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="relative px-5 py-24 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-[1240px]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Eyebrow>One workspace</Eyebrow>
                <h2
                  data-word-reveal
                  className="mt-5 max-w-xl text-[34px] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[50px]"
                >
                  Seven tools that share the same glass.
                </h2>
              </div>
              <p className="max-w-xs text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                Not a stack of disconnected tabs. The assistant, editor, models and measurements all
                read from the same project.
              </p>
            </div>

            <div className="mt-12 grid gap-3 md:grid-cols-6">
              {modules.map((module, index) => {
                const Icon = module.icon;
                const accent = accents[module.accent];
                return (
                  <MotionCard
                    key={module.title}
                    delay={index * 0.045}
                    className={cn(
                      "glass-card glass-sheen group p-5 sm:p-6",
                      module.span,
                      module.featured && "min-h-[300px]",
                    )}
                  >
                    <div
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-gradient-to-br to-transparent opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100",
                        accent.glow,
                      )}
                    />
                    <div className="relative flex items-start justify-between gap-4">
                      <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.12)]">
                        <Icon className={cn("size-4", accent.icon)} />
                      </span>
                      <span className="font-mono text-[9px] tracking-[0.18em] text-white/25">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="relative mt-5 text-[15px] font-semibold tracking-[-0.02em]">
                      {module.title}
                    </h3>
                    <p className="relative mt-2 max-w-sm text-[12.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                      {module.description}
                    </p>

                    {module.featured ? (
                      <div className="relative mt-8 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3.5">
                          <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
                            Streaming
                          </p>
                          <p className="mt-2 text-[12px] leading-relaxed text-white/60">
                            “I can refactor that module and keep the public API stable.”
                          </p>
                          <div className="mt-3 flex items-center gap-1.5">
                            <span className="typing-dots">
                              <span />
                              <span />
                              <span />
                            </span>
                            <span className="text-[9px] text-white/30">Astra is writing</span>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3.5">
                          <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
                            Guardrails
                          </p>
                          <div className="mt-2 space-y-2">
                            {[
                              ["Read project", "12 files"],
                              ["Propose patch", "approval"],
                              ["Run preview", "signed"],
                            ].map(([label, meta]) => (
                              <div key={label} className="flex items-center justify-between text-[10px]">
                                <span className="text-white/55">{label}</span>
                                <span className="text-[hsl(var(--mint))]/85">{meta}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="relative mt-5 inline-flex items-center gap-1 text-[10.5px] text-white/30 transition-colors group-hover:text-[hsl(var(--signal))]">
                        Explore <ArrowUpRight className="size-3" />
                      </span>
                    )}
                  </MotionCard>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="relative px-5 py-24 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-[1240px]">
            <div className="text-center">
              <Eyebrow>The workflow</Eyebrow>
              <h2
                data-word-reveal
                className="mx-auto mt-5 max-w-2xl text-[34px] font-semibold leading-[1.03] tracking-[-0.05em] sm:text-[48px]"
              >
                From a thought to a measured result.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[13.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                Every step stays inside one shell, so context never has to be copied into another
                tab.
              </p>
            </div>

            <div className="relative mt-14">
              <div aria-hidden="true" className="flow-line absolute left-6 right-6 top-7 hidden h-px lg:block" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {flow.map((step, index) => {
                  const Icon = step.icon;
                  const accent = accents[step.accent];
                  return (
                    <MotionCard
                      key={step.title}
                      delay={index * 0.07}
                      className="glass-card group relative p-5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="glass-subtle flex size-12 items-center justify-center rounded-2xl">
                          <Icon className={cn("size-5", accent.icon)} />
                        </span>
                        <span className="font-mono text-[9px] tracking-[0.2em] text-white/25">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <h3 className="mt-6 text-[17px] font-semibold tracking-[-0.03em]">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-[12px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                        {step.detail}
                      </p>
                      <span className={cn("mt-5 block size-1.5 rounded-full", accent.dot)} />
                    </MotionCard>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="models" className="relative px-5 py-24 sm:px-8 sm:py-28">
          <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div>
              <Eyebrow>Model layer</Eyebrow>
              <h2
                data-word-reveal
                className="mt-5 text-[34px] font-semibold leading-[1.03] tracking-[-0.05em] sm:text-[48px]"
              >
                Start free. Bring your own.
              </h2>
              <p className="mt-5 max-w-md text-[14px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                DeepSeek V4.1 Flash is ready the moment you sign in. When you need another model,
                add an endpoint in Model Hub without changing how the workspace works.
              </p>
              <ul className="mt-8 space-y-3.5">
                {[
                  "Streaming answers with full conversation history",
                  "Project context and approval-gated writes",
                  "Encrypted keys for every endpoint you add",
                  "One default model, switchable per conversation",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[13px]">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--mint))]/25 bg-[hsl(var(--mint))]/10 text-[hsl(var(--mint))]">
                      <Check className="size-3" />
                    </span>
                    <span className="text-white/65">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="group mt-8 inline-flex items-center gap-2 text-[12.5px] font-medium text-[hsl(var(--signal))]"
              >
                Try the assistant
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="glass-panel relative overflow-hidden rounded-[32px] p-2.5">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 size-64 rounded-full bg-[radial-gradient(circle,hsl(258_90%_70%/0.24),transparent_70%)] blur-3xl"
              />
              <div className="relative flex items-center gap-2 px-3 py-2">
                <Logo size={20} showWordmark={false} />
                <div>
                  <p className="text-[11.5px] font-medium">Model Hub</p>
                  <p className="text-[9px] text-white/35">four ways in · one interface</p>
                </div>
                <span className="ml-auto rounded-full border border-[hsl(var(--mint))]/25 bg-[hsl(var(--mint))]/10 px-2 py-0.5 text-[8.5px] text-[hsl(var(--mint))]">
                  ready
                </span>
              </div>
              <div className="relative rounded-[24px] border border-white/[0.07] bg-black/20 p-3">
                {modelRows.map((row, index) => {
                  const accent = accents[row.accent];
                  return (
                    <div
                      key={row.name}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-white/[0.04]",
                        index !== modelRows.length - 1 && "border-b border-white/[0.06]",
                      )}
                    >
                      <span className={cn("size-2 rounded-full", accent.dot)} />
                      <span className="min-w-0 flex-1 truncate text-[12px] text-white/75">
                        {row.name}
                      </span>
                      <span className="font-mono text-[9px] text-white/30">{row.meta}</span>
                      <ChevronRight className="size-3.5 text-white/20" />
                    </div>
                  );
                })}
              </div>
              <div className="relative mt-2 flex items-center gap-2 rounded-[20px] border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-[10px] text-white/35">
                <CircleDot className={cn("size-3", accents.blush.icon)} />
                DeepSeek Reasoner streams reasoning before the final answer.
              </div>
            </div>
          </div>
        </section>

        <section id="architecture" className="relative px-5 py-24 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-[1240px]">
            <div className="text-center">
              <Eyebrow>Under the glass</Eyebrow>
              <h2
                data-word-reveal
                className="mx-auto mt-5 max-w-2xl text-[34px] font-semibold leading-[1.03] tracking-[-0.05em] sm:text-[48px]"
              >
                Three layers, no hidden cloud.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[13.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                Run the whole stack on your machine, or keep the parts you care about. The contract
                between layers stays the same.
              </p>
            </div>

            <div className="relative mx-auto mt-16 max-w-3xl">
              <div className="space-y-3">
                {layers.map((layer, index) => {
                  const Icon = layer.icon;
                  const accent = accents[layer.accent];
                  return (
                    <MotionCard
                      key={layer.title}
                      delay={index * 0.08}
                      className={cn(
                        "glass-panel stack-layer flex flex-col gap-4 p-6 sm:flex-row sm:items-center",
                        index === 1 && "sm:ml-8",
                        index === 2 && "sm:ml-16",
                      )}
                    >
                      <span className="glass-subtle flex size-12 shrink-0 items-center justify-center rounded-2xl">
                        <Icon className={cn("size-5", accent.icon)} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[18px] font-semibold tracking-[-0.03em]">
                          {layer.title}
                        </h3>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                          {layer.detail}
                        </p>
                      </div>
                      <span className="font-mono text-[9px] tracking-[0.2em] text-white/25">
                        0{index + 1}
                      </span>
                    </MotionCard>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="open-source" className="relative px-5 pb-24 pt-8 sm:px-8 sm:pb-28">
          <div className="mx-auto max-w-[1240px]">
            <div className="glass-panel glass-sheen relative overflow-hidden rounded-[36px] px-6 py-16 text-center sm:px-12 sm:py-24">
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-0 h-72 w-[44rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(188_100%_60%/0.25),hsl(258_90%_70%/0.14),hsl(340_90%_72%/0.08),transparent_72%)] blur-3xl"
              />
              <div className="relative">
                <span className="mx-auto flex size-16 items-center justify-center rounded-3xl border border-white/15 bg-white/[0.08] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.2),0_30px_60px_-24px_hsl(0_0%_0%/0.7)]">
                  <Logo size={40} showWordmark={false} />
                </span>
                <h2
                  data-word-reveal
                  className="mx-auto mt-7 max-w-2xl text-[34px] font-semibold leading-[1.03] tracking-[-0.05em] sm:text-[50px]"
                >
                  Your next project is one message away.
                </h2>
                <p className="mx-auto mt-4 max-w-md text-[13.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                  Start with Astra Assistant, then add the models and tools that fit how you work.
                  Apache-2.0 and self-host ready.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                  <Link
                    href="/register"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "cta-glow h-12 w-full justify-center rounded-full px-8 sm:w-auto",
                    )}
                  >
                    Create a free account
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/login"
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "lg" }),
                      "glass-pill h-12 w-full justify-center rounded-full border-0 px-8 hover:bg-white/10 sm:w-auto",
                    )}
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Logo size={24} />
              <p className="mt-2 text-[11px] text-white/35">
                Build beyond limits. Local-first, open source.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-white/40">
              <Link href="/docs" className="transition-colors hover:text-white/85">Docs</Link>
              <Link href="/login" className="transition-colors hover:text-white/85">Sign in</Link>
              <a href="#platform" className="transition-colors hover:text-white/85">Platform</a>
              <a href="#models" className="transition-colors hover:text-white/85">Models</a>
              <span className="inline-flex items-center gap-1.5">
                <Waves className="size-3" /> Liquid by design
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
