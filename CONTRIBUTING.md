# Contributing to AstraCode

Thanks for helping improve AstraCode. This guide covers local setup, checks and conventions.

## Setup

```bash
pnpm install
pnpm run setup   # generates .env with secrets; use "run" to avoid pnpm's built-in command
pnpm dev         # web on :3000, API on :4000
```

Requirements: Node.js 20+, pnpm 9. The default embedded PGlite database needs no external service. Set `DATABASE_URL` to test against PostgreSQL; migrations apply automatically.

## Before opening a pull request

```bash
pnpm typecheck
pnpm test
pnpm build
```

All three must pass. Add tests for behavior you change:

- pure helpers and schemas → `packages/shared/test`
- provider parsing and agent actions → `packages/ai/test`
- crypto, tokens, API helpers → `apps/api/test`
- database schema/migrations → `packages/database/test`
- formatters and client-side helpers → `apps/web/test`
- extension SDK validation → `packages/extensions-sdk/test`

Never include real API keys, `.env`, `data/` or generated workspaces in a commit. Tests must not call paid provider APIs; use local fixtures or the mock patterns already in the suites.

## Conventions

- TypeScript strict mode; avoid `any` and non-null assertions unless the invariant is local and obvious.
- Keep API contracts in `packages/shared` (types and Zod schemas) so the web app and API cannot drift.
- Server-side secrets never cross into client components. Provider keys are encrypted and only returned as hints.
- Validate every filesystem path with `assertValidFilePath`/`isValidFilePath`; never join untrusted paths without validation.
- Extensions stay declarative. Do not add code execution to the extension surface.
- Match the existing UI: Tailwind tokens from `packages/ui`, Radix primitives, sentence-case copy, accessible labels and focus states.
- Keep commits focused. Explain the user-visible change and how you tested it. Do not include AI attribution or `Co-Authored-By` trailers.

## Database changes

1. Edit `packages/database/src/schema.ts`.
2. Run `pnpm db:generate` and commit the new SQL in `packages/database/migrations`.
3. Run `pnpm test` (the database suite applies migrations to a temporary PGlite instance) and `pnpm typecheck`.

## Adding an extension

Use `defineExtension` from `@astracode/extensions-sdk`; it validates the manifest and throws with every problem found. Manifests may contain templates (`project:write`) and prompts (`chat:presets`); they cannot execute code. If you add a new permission, update the SDK catalog and document what it grants.

## Security reports

Do not open a public issue for a vulnerability. Contact the maintainers privately with reproduction steps and affected versions. Rotate any credential that may have been exposed.
