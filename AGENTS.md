# AGENTS.md

Instructions for coding agents (opencode, Claude Code, Codex, etc.) working in this repository.
Read this first, then `.agent/schema-review.md` before touching the database schema.

## Project

**Internery** — a part-time job marketplace for students (Vietnamese market: VND amounts, Vietnamese
copy planned). Two roles: `STUDENT` and `EMPLOYER`, plus `ADMIN` moderation. The written spec has
46 user stories, 55 functional requirements and 30 non-functional requirements.

Stack: SvelteKit 3 (Svelte 5, runes only), Tailwind CSS 4, Better Auth, Drizzle ORM, PostgreSQL,
pnpm. Adapter is `adapter-auto`; no deployment target chosen yet.

## Source of truth

The design contracts and private notes live in `.tmp/` and `.agent/`, which are **gitignored**, so
nothing there is published. Do not treat them as application code; copy what is needed into `src/`
when adopting it.

| File                 | Role                                                              |
| -------------------- | ----------------------------------------------------------------- |
| `.tmp/schema.ts`     | DB contract: 17 tables, 12 enums, constraints, indexes, relations |
| `.tmp/openapi.yaml`  | API contract: OpenAPI 3.1, 71 operations under `/api/v1`          |
| `.tmp/invariants.ts` | Transactional service rules + work-record signing                 |
| `.tmp/README.md`     | ERD, enforcement matrix, open product decisions                   |

Safe to ignore:

- `.tmp/package.json` — dependency manifest of the contract harness, not of this app.
- `.tmp/0000_init.sql` — generated. Verified byte-identical to
  `drizzle-kit generate --dialect postgresql --schema .tmp/schema.ts --casing snake_case`.
  Regenerate it; never hand-edit it.
- `.tmp/gen-check/` — transient output from verification; delete when done.

Not present (paths relative to `.tmp/`, referenced by its README, so its checks cannot run):
`check/`, `docs/SRS.md`, `redocly.yaml`.

## Current state

- The app is still the `sv create` scaffold: default landing page, Better Auth demo routes under
  `/demo/better-auth`, and a placeholder `task` table in `src/lib/server/db/schema.ts`.
- `src/lib/server/db/auth.schema.ts` is a stub. `pnpm auth:schema` has not been run (deferred).
  The generated `auth-schema.ts` at the repository root is not imported by the app.
- `.env` does not exist yet. `node_modules` is installed.
- Product schema, service layer, API routes and real UI are **not implemented**.

## Commands

```sh
pnpm dev                 # Vite dev server
pnpm build               # production build
pnpm check               # svelte-kit sync + svelte-check
pnpm lint                # prettier --check + eslint
pnpm format              # prettier --write
pnpm db:start            # docker compose up (Postgres on :5432)
pnpm db:generate         # drizzle-kit generate
pnpm db:migrate          # drizzle-kit migrate
pnpm db:push             # drizzle-kit push (prototyping only)
pnpm db:studio           # drizzle-kit studio
pnpm auth:schema         # regenerate Better Auth tables into src/lib/server/db/auth.schema.ts
```

Env vars are declared in `src/env.ts` and read from `$app/env/private` in server code:
`DATABASE_URL`, `ORIGIN`, `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.
`.env.example` still points at `root:mysecretpassword@.../local`, while `docker-compose.yaml` uses
`internery:internery@.../internery`; fix the URL when creating `.env`.

## Readability first

Write for the next reader, not for the fewest lines. Clever code is a liability in this project:
the business rules are already subtle, so the implementation must be obvious.

- **Clear names.** Name things for what they mean: `applicationsForJob`, not `apps` or `data2`.
  Booleans read as questions: `isHidden`, `hasAcceptedApplicant`, `canReview`. Avoid abbreviations
  except widely understood ones (`id`, `url`, `db`).
- **Plain constructs.** Prefer `if`, `for`, `map`, `filter` and early returns over clever one-liners.
  Do not use nested ternaries, bitwise tricks, implicit coercion, or language features whose value is
  mainly that they are short. If a line needs a comment to explain _what_ it does, rewrite the line.
- **Shallow nesting.** Use guard clauses and early returns. If a function needs more than two or
  three levels of nesting, extract a named helper. Keep each function focused on one job.
- **Comments explain why.** Use them for business rules, non-obvious constraints, transaction and
  locking reasons, and workarounds (including why the workaround exists). Do not restate the code.
  Keep the comment next to the code it describes and update it when the code changes.
- **Doc comments for contracts.** Every exported service function, public type and non-obvious module
  gets a short TSDoc block: what it does, the parameters that matter, what it throws, and any
  transaction guarantee. Business rules and invariants deserve a doc comment even when not exported.
- **Whitespace is structure.** Put a blank line between logical blocks, group related statements,
  and separate validation from work from the return. Prefer several short lines over one long
  expression. Stay within the 100-column Prettier width.
- **No `any`.** Use `unknown` and narrow it. Keep types explicit at module boundaries and let
  inference handle local values.
- **Follow the file.** Match the surrounding style. Do not reformat unrelated code in the same
  change.

A small example of the intended shape:

```ts
/** Rejects an application that is no longer pending. */
export async function rejectApplication(...) {
	const job = await lockJob(tx, application.jobId);

	if (!job) {
		throw new DomainError('NOT_FOUND');
	}

	if (job.employerId !== employerId) {
		throw new DomainError('FORBIDDEN');
	}

	if (application.status !== 'PENDING') {
		throw new DomainError('INVALID_STATE_TRANSITION');
	}

	// ...
}
```

## Conventions

The readability rules above apply to every change. These are the project-specific conventions:

- Prettier: tabs, single quotes, no trailing comma, width 100. ESLint: flat config.
- Doc comments use TSDoc (`/** ... */`), not line comments above the declaration.
- Svelte 5 runes only (`$props`, `$state`, `$derived`, `$effect`); no legacy `export let`.
- Import app code through `#lib/*` (`#lib/server/...`). Existing imports include the `.ts`
  extension; keep that style.
- Server-only code lives under `src/lib/server/` and must never be imported into client code.
  Environment access belongs in server modules.
- Tailwind 4 utilities; the CSS entry point is `src/routes/layout.css`.
- Keep API field names, enum values and length limits aligned with `.tmp/openapi.yaml`.
- Money is an integer VND amount. Timestamps are `timestamptz`; job dates are `date`.

## Domain map

| Group       | Tables                                                        |
| ----------- | ------------------------------------------------------------- |
| Identity    | `users`, `user_tokens`                                        |
| Profiles    | `student_profiles`, `employer_profiles`                       |
| Marketplace | `categories`, `jobs`, `applications`, `saved_jobs`            |
| Trust       | `reviews`, `reports`, `verification_requests`, `work_records` |
| Engagement  | `notifications`                                               |
| AI          | `ai_consents`, `ai_explanations`, `ai_usage`                  |
| Audit       | `audit_logs`                                                  |

Rules that must be enforced in transactions (`.tmp/invariants.ts`), never by ad-hoc writes:

- `acceptApplication` / `rejectApplication` — capacity, row lock on the job, auto-`FILLED`.
- `changeJobStatus` — `HIRING → FILLED → COMPLETED`, `HIRING|FILLED → CANCELLED`; terminal states final.
- `submitReport` — 3 distinct reporters auto-hide the job.
- `createReview` — only on `COMPLETED`; reviewer/reviewee must be employer and accepted student;
  recalculate ratings; employer→student also issues the HMAC-signed work record.
- `signRecord` / `verifyRecord` — HMAC-SHA256 over canonical JSON.

## Deferred decision: snake_case

`.tmp/schema.ts` declares columns without explicit names and relies on `casing: 'snake_case'` in
**both** `drizzle.config.ts` and the runtime client. This project currently sets neither. Do not port
the schema and generate migrations until this is resolved: either add
`casing: 'snake_case'` in both places, or give every column an explicit snake_case name. Generating
without it produces camelCase columns that will not match `.tmp/0000_init.sql`.

## Known issues to settle before implementation

See `.agent/schema-review.md` for evidence and proposed patches. The blocking one is identity:

- The contract assumes a credentials-only `users` table (`password_hash NOT NULL`) with its own
  `user_tokens`. The scaffold uses Better Auth, which generates `user`, `session`, `account` and
  `verification` tables with text IDs. These must be reconciled before any auth or FK work.

Other findings: the student CV check only guards two of four CV columns; rating recalculation can
race across jobs; a withdrawn application cannot be re-submitted because the uniqueness constraint is
unconditional; several `text` columns are stricter in the API than in the DB; hidden-state and
verification-status fields can drift from their status flags.

## Working agreements

- Do not invent contract details. If a decision is missing, write it down and ask.
- Prefer the readable version even when a shorter version exists. Before finishing, reread the diff
  for names, nesting, comments and whitespace.
- Copy contract files into `src/` deliberately. Keep private notes in `.agent/`; both `.tmp/` and
  `.agent/` are ignored by git and are never published.
- Run `pnpm check` and `pnpm lint` before calling work finished.
- Keep diffs focused; do not reformat unrelated files.
