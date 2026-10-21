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

- The app is still the `sv create` scaffold: default landing page and Better Auth demo routes under
  `/demo/better-auth`. The placeholder `task` table has been replaced by the product schema.
- Better Auth owns identity. `src/lib/server/db/auth.schema.ts` is generated with UUID ids, plural
  tables (`users`, `sessions`, `accounts`, `verifications`), and server-owned `role` and `status`
  fields. `pnpm auth:schema` regenerates and formats it. The root `auth-schema.ts` is stale and
  unimported; do not use it.
- Authentication uses Argon2id and Resend, and requires email verification before sign-in. A real
  Resend key and a verified sender address are required for verification mail.
- `src/lib/server/db/product.schema.ts` contains the product tables: common profile/moderation
  tables, student and employer profiles, marketplace, trust, notifications, AI and audit tables.
  All user foreign keys reference the generated `users.id` as `uuid`.
- `src/lib/server/db/schema.ts` only re-exports the auth and product schemas; Drizzle and
  drizzle-kit consume that aggregate.
- The baseline migration `drizzle/0000_pink_thundra.sql` has been generated and applied to the local
  database. All 21 tables exist.
- `.env` exists locally and `node_modules` is installed.
- Docker Compose provides Postgres, MinIO, and a one-shot `minio-init` job that creates the
  `${S3_BUCKET:-internery-staging}` bucket. MinIO uses the Chainguard image because the upstream
  community images were removed from Docker Hub and Quay in 2025.
- Product **service layer, API routes and real UI are not implemented**. The contract
  `.tmp/schema.ts` is intentionally unchanged.

## Commands

```sh
pnpm dev                 # Vite dev server
pnpm build               # production build
pnpm check               # svelte-kit sync + svelte-check
pnpm lint                # prettier --check + eslint
pnpm format              # prettier --write
pnpm db:start            # docker compose up (Postgres :5432, MinIO :9000/:9001)
pnpm db:generate         # drizzle-kit generate
pnpm db:migrate          # drizzle-kit migrate
pnpm db:push             # drizzle-kit push (prototyping only)
pnpm db:studio           # drizzle-kit studio
pnpm auth:schema         # regenerate Better Auth tables into src/lib/server/db/auth.schema.ts
```

Env vars are declared in `src/env.ts` and read from `$app/env/private` in server code:
`DATABASE_URL`, `ORIGIN`, `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
`RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`.
`.env.example` still points at `root:mysecretpassword@.../local`, while `docker-compose.yaml` uses
`internery:internery@.../internery`; fix the URL in `.env` if it does not match.

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

## Installed skills

Project skills live in `.agents/skills/` and are pinned by `skills-lock.json`. Commit both.

| Skill         | Purpose                                                           |
| ------------- | ----------------------------------------------------------------- |
| `grill-me`    | Thin wrapper that invokes `grilling`; requires both to be present |
| `grilling`    | Relentless interview to stress-test a plan or decision            |
| `find-skills` | Discover and install additional agent skills                      |
| `git-commit`  | Conventional-commit analysis, staging and message generation      |

Update installed skills with `npx skills update`. Restore them on a fresh checkout with
`npx skills experimental_install`.

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
| Identity    | Contract: `users`, `user_tokens`; app: Better Auth tables     |
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

## Decision: camelCase product columns

The product schema uses camelCase database column names. Neither `drizzle.config.ts` nor the runtime
client sets `casing`, so Drizzle's default naming is what creates the columns. TypeScript properties
are camelCase as well.

The generated auth schema is different: Better Auth declares explicit snake_case column names
(`email_verified`, `user_id`, ...). The database therefore has mixed naming: auth tables are
snake_case and product tables are camelCase. That is intentional.

The product schema therefore no longer matches `.tmp/0000_init.sql`, which was generated with
`casing: 'snake_case'`. Treat the contract SQL as a reference for constraints and indexes, not as the
source of the app migration.

## Known issues to settle before implementation

See `.agent/schema-review.md` for evidence and proposed patches.

The identity conflict is resolved in favour of Better Auth: the app uses the generated `users`,
`sessions`, `accounts` and `verifications` tables. The contract's `users` and `user_tokens` tables
were not ported; every user foreign key points at `users.id` as `uuid`, and `password_hash`
responsibilities live in `accounts.password`. Common profile fields are in `user_profiles`; lockout
and admin-lock fields are in `user_moderation`.

Other findings: the student CV check only guards two of four CV columns; rating recalculation can
race across jobs; a withdrawn application cannot be re-submitted because the uniqueness constraint is
unconditional; several `text` columns are stricter in the API than in the DB; hidden-state and
verification-status fields can drift from their status flags. The auth tables use `timestamp`
without time zone while product timestamps use `timestamptz`, because Better Auth generates that
column type.

## Working agreements

- Do not invent contract details. If a decision is missing, write it down and ask.
- Prefer the readable version even when a shorter version exists. Before finishing, reread the diff
  for names, nesting, comments and whitespace.
- Copy contract files into `src/` deliberately. Keep private notes in `.agent/`; both `.tmp/` and
  `.agent/` are ignored by git and are never published.
- Run `pnpm check` and `pnpm lint` before calling work finished.
- Keep diffs focused; do not reformat unrelated files.
