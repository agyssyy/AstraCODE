import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, ChevronRight } from "lucide-react";
import { buttonVariants, cn } from "@astracode/ui";
import { Logo } from "@/components/brand/logo";
import { Markdown } from "@/components/chat/markdown";
import { DocsSearch } from "@/components/docs/docs-search";

export const metadata: Metadata = { title: "Documentation" };

const CONTENT = `# AstraCode documentation

AstraCode is a self-hosted AI developer platform: chat with streaming responses, a project workspace with an editor, terminal and preview, model management for any OpenAI-compatible provider, benchmarks and declarative extensions.

## Quick start

1. Run \`pnpm install\` and \`pnpm run setup\` to create \`.env\` and start the database.
2. \`pnpm dev\` starts the web app on **http://localhost:3000** and the API on **http://localhost:4000**.
3. Register the first account — it is local to your instance; there is no central sign-up.
4. Open **Providers** to connect an endpoint, test it and pick a default, then add models in **Model Hub**.

\`\`\`bash
pnpm install
pnpm run setup
pnpm dev
\`\`\`

The embedded database (PGlite) stores data in \`./data/pg\`. To use PostgreSQL instead, set \`DATABASE_URL\` in \`.env\` before starting. Migrations run automatically.

## Connect a model

AstraCode includes **Astra Assistant**, a built-in model that works for every account with no provider setup. The server routes it through the shared \`BUILTIN_AI_*\` configuration; set \`BUILTIN_AI_BASE_URL\` and \`BUILTIN_AI_API_KEY\` in \`.env\` to point it at your own gateway.

You can also add your own provider and switch the default at any time:

- **OpenAI** — \`https://api.openai.com/v1\`
- **GitHub Models** — \`https://models.github.ai/inference\` (PAT with \`models:read\`)
- **NVIDIA NIM** — \`https://integrate.api.nvidia.com/v1\`
- **Groq** — \`https://api.groq.com/openai/v1\` (very fast inference)
- **Cerebras** — \`https://api.cerebras.ai/v1\`
- **OpenRouter** — \`https://openrouter.ai/api/v1\`
- **OpenCode** — \`https://opencode.ai/inference/openai/v1\` (OpenCode Console key)
- **DeepSeek** — \`https://api.deepseek.com/v1\`
- **xAI** — \`https://api.x.ai/v1\`
- **Together** — \`https://api.together.xyz/v1\`
- **Fireworks** — \`https://api.fireworks.ai/inference/v1\`
- **Ollama** — \`http://127.0.0.1:11434\` (local, no key)
- Any gateway implementing \`/chat/completions\` and \`/models\`

ChatGPT/Codex plans and GitHub Copilot subscriptions are not API keys. Use the OpenAI API key, or a GitHub PAT with \`models:read\` for GitHub Models.

Provider keys are encrypted with AES-256-GCM using \`APP_ENCRYPTION_KEY\`. The API only returns a masked hint (\`•••• ab12\`) after saving.

> Response speed depends almost entirely on the provider and model you choose. Groq and Cerebras are the fastest hosted options for open models; smaller models reply faster but are less capable.

## Chat and Agent mode

Chats stream over Server-Sent Events. Messages are stored with token usage and latency; usage is marked **measured** when the provider returns usage numbers and **estimated** otherwise.

Enable **Agent** to let the model propose file writes or deletes. Proposals appear as approval cards — nothing touches your project until you press **Approve**. The model cannot execute code.

Attach a project to a conversation to include its files (up to a size budget) as context. Installed extensions can add prompt presets.

## Studio

Studio combines a file tree, Monaco editor, project shell and preview:

- **Files** are stored in the database and mirrored to \`data/workspaces/<projectId>\`.
- **Terminal** commands run server-side in that directory with a 20 second timeout and 200 KB output cap. Treat it as a convenience sandbox, not a hardened container.
- **Preview** serves static files through an HMAC-signed, one-hour URL.
- **Import/Export** uses the \`.astracode.json\` format (max 2 MB per import).
- **Ask Astra** creates a project-aware conversation.

## Benchmarks

Benchmarks send each suite prompt to up to four models using your keys, recording latency, tokens, errors and output. Results feed the leaderboard. Runs are stored and can be revisited or deleted.

## Extensions

Extensions are **declarative manifests**: project templates and prompt presets, with declared permissions such as \`project:write\` or \`chat:presets\`. No third-party code is executed. Install, disable or remove them from the Extensions page; installed templates appear in Studio and prompts in Chat.

## API Explorer

Send HTTP requests server-side to inspect APIs. Requests have a 20 second timeout and responses are capped at 400 KB. Header values that look like secrets are masked in history, so loaded history never resends a stored credential.

## Security model

- Sessions are opaque tokens in \`HttpOnly\`, \`SameSite=Lax\` cookies; passwords use scrypt.
- Mutating cookie-authenticated requests require an allowed \`Origin\` (CSRF protection).
- Provider keys and preview URLs are encrypted/signed server-side; secrets are never logged.
- Rate limits protect auth, chat, execution and benchmarking endpoints.
- Preview and workspace paths are validated against traversal.

AstraCode runs on your own machine. Back up \`./data\` and keep \`.env\` private.

## Self-hosting

Set \`WEB_ORIGIN\`, \`APP_ENCRYPTION_KEY\` and (optionally) \`DATABASE_URL\` in \`.env\` (or run \`pnpm run setup\`). For production, build once and run the API and web processes behind a reverse proxy on the same site so cookies are shared.

\`\`\`bash
pnpm run setup   # first run only: writes .env with fresh secrets
pnpm install
pnpm build
pnpm --filter @astracode/api start &   # Fastify API on :4000
pnpm --filter @astracode/web start     # Next.js on :3000
\`\`\`

The API serves the browser directly (\`NEXT_PUBLIC_API_URL\`) and preview URLs are signed; keep both processes running and back up \`ASTRACODE_DATA_DIR\`.

## Limitations

- Authentication is implemented in Fastify rather than Auth.js; the data model is the same (users and sessions).
- Ollama is accessed through its native \`/api/chat\` endpoint.
- Extensions cannot ship executable code by design.
- Benchmarks and chats consume provider quota; there is no offline model bundled.
`;

const SECTIONS = [
  { id: "quick-start", label: "Quick start" },
  { id: "connect-a-model", label: "Connect a model" },
  { id: "chat-and-agent-mode", label: "Chat & agent" },
  { id: "studio", label: "Studio" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "extensions", label: "Extensions" },
  { id: "api-explorer", label: "API Explorer" },
  { id: "security-model", label: "Security" },
  { id: "self-hosting", label: "Self-hosting" },
  { id: "limitations", label: "Limitations" },
];

export default function DocsPage() {
  return (
    <div className="relative min-h-dvh">
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="glass-panel mx-auto flex h-14 max-w-[1180px] items-center gap-3 rounded-full px-3 pl-4 sm:px-4 sm:pl-5">
          <Link href="/" aria-label="AstraCode home" className="shrink-0">
            <Logo size={23} />
          </Link>
          <span className="hidden items-center gap-1.5 text-[11.5px] text-[hsl(var(--muted-foreground))] sm:flex">
            <ChevronRight className="size-3" />
            Documentation
          </span>
          <div className="ml-auto hidden w-64 md:block">
            <DocsSearch sections={SECTIONS} />
          </div>
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <Link
              href="/"
              className="hidden rounded-full px-3 py-1.5 text-[11.5px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-white/[0.07] hover:text-[hsl(var(--foreground))] sm:inline"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ size: "sm" }), "h-9 rounded-full px-4 text-[12px]")}
            >
              Open app
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1180px] gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[230px_1fr] lg:gap-5 lg:py-5">
        <aside className="hidden lg:block">
          <div className="glass-panel sticky top-24 overflow-hidden rounded-[28px] p-3">
            <div className="px-2.5 pb-2 pt-1">
              <p className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                <BookOpen className="size-3 text-[hsl(var(--signal))]" /> On this page
              </p>
            </div>
            <ul className="space-y-0.5">
              {SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="group flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11.5px] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-white/[0.07] hover:text-[hsl(var(--foreground))]"
                  >
                    <span className="font-mono text-[8px] text-white/20">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-white/[0.08] px-2.5 pt-3">
              <p className="text-[10px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                Missing something? Open a discussion on GitHub.
              </p>
              <a
                href="https://github.com/agyssyy/AstraCODE"
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-[hsl(var(--signal))]"
              >
                Repository <ArrowUpRight className="size-3" />
              </a>
            </div>
          </div>
        </aside>

        <article className="min-w-0">
          <div className="mb-4 lg:hidden">
            <DocsSearch sections={SECTIONS} />
          </div>

          <div className="glass-panel overflow-hidden rounded-[30px]">
            <div className="border-b border-white/[0.08] px-5 py-5 sm:px-8 sm:py-7">
              <p className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                Docs <ChevronRight className="size-2.5" /> AstraCode
              </p>
              <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.045em] sm:text-[38px]">
                Documentation
              </h1>
              <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                Everything from your first local install to provider configuration, agent
                approvals and self-hosting.
              </p>
            </div>

            <div className="px-5 py-7 sm:px-8 sm:py-9">
              <Markdown content={CONTENT} />
            </div>

            <div className="grid gap-2 border-t border-white/[0.08] p-4 sm:grid-cols-2 sm:p-5">
              <a
                href="#quick-start"
                className="glass-subtle group flex items-center gap-3 rounded-2xl p-3.5 transition-colors hover:bg-white/[0.08]"
              >
                <ArrowLeft className="size-4 text-[hsl(var(--muted-foreground))]" />
                <span>
                  <span className="block text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                    Previous
                  </span>
                  <span className="text-[12px] font-medium">Quick start</span>
                </span>
              </a>
              <a
                href="#connect-a-model"
                className="glass-subtle group flex items-center justify-end gap-3 rounded-2xl p-3.5 text-right transition-colors hover:bg-white/[0.08]"
              >
                <span>
                  <span className="block text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                    Next
                  </span>
                  <span className="text-[12px] font-medium">Connect a model</span>
                </span>
                <ArrowRight className="size-4 text-[hsl(var(--muted-foreground))]" />
              </a>
            </div>
          </div>

          <p className="mt-4 px-2 text-[10.5px] text-[hsl(var(--muted-foreground))]">
            AstraCode is open source under the Apache-2.0 license. Found an issue? Open a
            discussion in the repository.
          </p>
        </article>
      </div>
    </div>
  );
}
