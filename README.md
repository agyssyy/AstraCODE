# AstraCode

**Open-source AI developer platform. Build beyond limits.**

AstraCode is a self-hosted workspace for working with AI models: streaming chat with project context, an editor with terminal and live preview, a model hub for any OpenAI-compatible or Ollama provider, benchmarks, and declarative extensions. Your keys, conversations, projects and files stay on your machine.

## Features

- **Chat**: streaming responses, multiple conversations, project-aware context, system prompts, agent mode that proposes file writes/deletes behind explicit approval, usage and latency reporting. Reasoning tokens appear in a collapsible **Thought** panel instead of the answer.
- **OpenCode Free**: optional built-in model (DeepSeek V4.1 Flash, max reasoning) through a local OpenCode runtime — no API key.
- **Account security**: password reset by one-time email link, optional Google sign-in with automatic account creation, and email-code two-step verification on every login and signup.
- **Studio**: Monaco editor (self-hosted), file tree, create/rename/delete files, `Ctrl/Cmd+S` save, embedded terminal over SSE, signed preview URLs, project templates and import/export.
- **Model Hub**: bring your own provider — OpenAI, Groq, Cerebras, OpenRouter, OpenCode, DeepSeek, Mistral, Together, any OpenAI-compatible endpoint, or Ollama. Keys are encrypted at rest; discover models or add them manually.
- **Benchmarks**: run coding suites against up to four models, stream progress, compare latency/tokens/errors and track a leaderboard.
- **Extensions**: prompt packs and project templates described by declarative manifests. No third-party code executes. Includes a small SDK for authoring and validating manifests.
- **API Explorer**: send server-side HTTP requests with masked secret history.
- **Accounts**: local email/password auth with scrypt, opaque session cookies, session management and account deletion. No central sign-up, no telemetry.

## Architecture

```
apps/
  web/                 Next.js 15 (App Router, React 19, Tailwind)
  api/                 Fastify 5 + SSE, Drizzle, PGlite or PostgreSQL
packages/
  ai/                  OpenAI-compatible and Ollama adapters, SSE parsing, agent actions
  database/            Drizzle schema, migrations, embedded PGlite bootstrap, seed
  shared/              Shared types, Zod schemas, benchmark suites, prompt helpers
  ui/                  Tailwind + Radix component primitives
  extensions-sdk/      Author, validate and freeze extension manifests
scripts/               Environment setup
data/                  Local workspaces and embedded database (gitignored)
```

The browser talks to the Fastify API directly (`NEXT_PUBLIC_API_URL`), except when Next.js server components call the API internally (`API_INTERNAL_URL`). The web app never sees decrypted provider keys.

## Quick start

Requirements: **Node.js 20+**, **pnpm 9** (Corepack works: `corepack enable`).

```bash
pnpm install
pnpm run setup   # writes .env with secure secrets (pnpm's own setup is different)
pnpm dev
```

Use `pnpm run setup`, not `pnpm setup` — the latter invokes pnpm's built-in command.

Open **http://localhost:3000**, register the first account, then connect a provider on the **Providers** dashboard (or in **Model Hub**):

| Provider | Base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| GitHub Models | `https://models.github.ai/inference` |
| NVIDIA NIM | `https://integrate.api.nvidia.com/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| Cerebras | `https://api.cerebras.ai/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| OpenCode | `https://opencode.ai/inference/openai/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| xAI | `https://api.x.ai/v1` |
| Together | `https://api.together.xyz/v1` |
| Fireworks | `https://api.fireworks.ai/inference/v1` |
| Mistral | `https://api.mistral.ai/v1` |
| Ollama (local) | `http://127.0.0.1:11434` |

ChatGPT/Codex plans and GitHub Copilot subscriptions are not API keys. Use an OpenAI API key for the OpenAI endpoint, or a GitHub personal access token with `models:read` for GitHub Models.

AstraCode includes OpenCode Free when a local OpenCode runtime is available at `OPENCODE_SERVER_URL`; otherwise it uses the providers you connect. Paid provider usage is billed by that provider.

## Configuration

Copy `.env.example` to `.env` or let `pnpm run setup` generate one.

| Variable | Purpose |
| --- | --- |
| `WEB_ORIGIN` | Public URL of the web app; used for CORS, CSRF origin checks and cookie `Secure` flags. |
| `NEXT_PUBLIC_API_URL` | URL the browser uses to reach the API. Default `http://localhost:4000`. |
| `API_INTERNAL_URL` | Server-to-server API URL used by Next.js. Default `http://127.0.0.1:4000`. |
| `API_HOST` / `API_PORT` | Fastify bind address and port. |
| `APP_ENCRYPTION_KEY` | Base64 32-byte AES-256-GCM key for provider credentials. Required. |
| `PREVIEW_SECRET` | Secret used to sign short-lived preview URLs. Required, 16+ chars. |
| `DATABASE_URL` | Optional external PostgreSQL. Empty uses embedded PGlite. |
| `ASTRACODE_DATA_DIR` | Project workspaces and embedded database. Default `./data`. |
| `NODE_ENV` | `development` or `production`. |
| `AUTH_EMAIL_CODE_REQUIRED` | `auto` (default), `true` or `false`. Requires a 6-digit email code on login/signup; `auto` enables it when SMTP is configured. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | SMTP sender for login codes. Without SMTP, keep `AUTH_EMAIL_CODE_REQUIRED=auto`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth web client. Leave empty to hide the Google button. |
| `GOOGLE_REDIRECT_URI` | Optional exact callback URL. Defaults to the current origin + `/backend/auth/google/callback`. |
| `OPENCODE_FREE_ENABLED` | Enable the built-in OpenCode Free model. Default `true`. |
| `OPENCODE_SERVER_URL` | Local OpenCode server URL. Default `http://127.0.0.1:4096`. |
| `OPENCODE_SERVER_PASSWORD` | Password for the local OpenCode server, if set. |
| `OPENCODE_FREE_MODEL` / `OPENCODE_FREE_LABEL` | Model id and display label for OpenCode Free. |

Migrations run automatically at API startup. Back up `ASTRACODE_DATA_DIR`; with PGlite that directory is the database.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run API (`:4000`) and web (`:3000`) together. |
| `pnpm dev:api` / `pnpm dev:web` | Run one side. |
| `pnpm build` | Typecheck all packages and build the Next.js app. |
| `pnpm typecheck` | TypeScript across the workspace. |
| `pnpm test` | Vitest suites across the workspace. |
| `pnpm db:generate` | Generate Drizzle migrations after schema changes. |
| `pnpm db:migrate` | Apply migrations manually. |

## Self-hosting

```bash
pnpm install
pnpm run setup
pnpm build
pnpm --filter @astracode/api start
pnpm --filter @astracode/web start
```

Run both processes behind a reverse proxy on the same site so cookies are shared, and set `WEB_ORIGIN` to the public HTTPS URL. Cookies are marked `Secure` when `WEB_ORIGIN` starts with `https://`. The API must be reachable from browsers at `NEXT_PUBLIC_API_URL`.

## Security model

- Passwords use scrypt with per-user salts; sessions are random opaque tokens stored as hashes in `HttpOnly`, `SameSite=Lax` cookies.
- Cookie-authenticated mutations require an allowed `Origin`, and auth/chat/exec/benchmark routes are rate-limited.
- Provider keys are AES-256-GCM encrypted; APIs return only the last four characters (`keyHint`). Keys are never logged.
- Project and preview paths are validated against traversal; previews use HMAC-signed, expiring URLs.
- Terminal commands run as the API process user in the project workspace with a timeout and output cap. Treat workspace access as shell access to your machine.
- Extensions are declarative and cannot execute code.
- No analytics, telemetry or third-party scripts are loaded by the app.

Report vulnerabilities privately rather than opening a public issue.

## Extension SDK

```ts
import { defineExtension } from "@astracode/extensions-sdk";

export default defineExtension({
  id: "my-review-pack",
  name: "My review pack",
  description: "A focused code review prompt.",
  category: "Prompt Packs",
  version: "1.0.0",
  author: "you",
  permissions: ["chat:presets"],
  manifest: {
    prompts: [
      {
        id: "review",
        title: "Review",
        description: "Review correctness and clarity.",
        prompt: "Review this code for correctness, clarity and edge cases.",
      },
    ],
  },
});
```

`defineExtension` validates ids, semver, permissions, template file paths and manifest shape, then freezes the result. See `packages/extensions-sdk`.

## Google sign-in

1. Create an **OAuth 2.0 Client ID → Web application** in the Google Cloud Console.
2. Add an authorized redirect URI: `http://localhost:3000/backend/auth/google/callback` (and your LAN URL if you open the app over the network).
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`, then restart the API.
4. The Google button appears on the login and signup screens. The first Google sign-in creates the user, settings and email verification automatically; later sign-ins link by Google account id or verified email. Existing two-step verification still applies.

Password reset needs SMTP (`SMTP_USER` / `SMTP_PASS`) or a per-user SMTP password. Reset links are single-use and expire after 30 minutes; all sessions are revoked after a reset.

## Known limitations

- Authentication lives in Fastify rather than Auth.js; the user/session data model is equivalent.
- Ollama uses its native `/api/chat` API; other providers use the OpenAI-compatible chat completions API.
- Provider streaming formats vary; errors are normalized into auth, rate-limit, not-found, network, timeout and bad-response categories.
- Benchmarks use your provider quota and record model output as-is.

## License

Apache-2.0. See [LICENSE](./LICENSE).
