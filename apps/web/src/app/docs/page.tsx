import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { buttonVariants, cn } from "@astracode/ui";
import { Logo } from "@/components/brand/logo";
import { Markdown } from "@/components/chat/markdown";

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
    <div className="min-h-dvh bg-[hsl(var(--background))]">
      <header className="sticky top-0 z-20 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/85 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              <ArrowLeft className="size-3.5" /> Home
            </Link>
            <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
              Open app
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[190px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <p className="mb-2 flex items-center gap-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <BookOpen className="size-3" /> On this page
            </p>
            <ul className="space-y-0.5">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block rounded px-2 py-1 text-[11.5px] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <article className="min-w-0">
          <div className="mb-4 lg:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Documentation
            </p>
          </div>
          <Markdown content={CONTENT} />
          <div className="mt-8 border-t border-[hsl(var(--border))] pt-4 text-[11.5px] text-[hsl(var(--muted-foreground))]">
            Found an issue? Open a discussion in the repository. AstraCode is open source under the
            Apache-2.0 license.
          </div>
        </article>
      </div>
    </div>
  );
}
