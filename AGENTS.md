# AGENTS.md

Instructions for coding agents (opencode, Claude Code, Codex, etc.) working in this repository.
Read this first, then `.agents/schema-review.md` before touching the database schema.

## Project

**Internery** — a part-time job marketplace for students (Vietnamese market: VND amounts, Vietnamese
copy planned). Two roles: `STUDENT` and `EMPLOYER`, plus `ADMIN` moderation. The written spec has
46 user stories, 55 functional requirements and 30 non-functional requirements.

Stack: SvelteKit 3 (Svelte 5, runes only), Tailwind CSS 4, Better Auth, Drizzle ORM, PostgreSQL,
pnpm. Adapter is `@sveltejs/adapter-node`; the Docker demo is the only deployment target so far.

## Source of truth

Durable contracts and decisions live in `docs/`. The agent workspace is `.agents/`, which is
committed: it holds the installed skills, review notes and scratch. Nothing in it is application
code; copy what is needed into `src/` when adopting it.

| File                                      | Role                                                           |
| ----------------------------------------- | -------------------------------------------------------------- |
| `docs/contracts/openapi.yaml`             | API contract: OpenAPI 3.1, 69 operations under `/api/v1`       |
| `docs/contracts/implementation-status.md` | Per-operation checklist of what exists and what is `501`       |
| `docs/contracts/invariants.ts`            | Transactional service rules + work-record signing              |
| `docs/roadmap.md`                         | Phase plan from the API foundation through deployment          |
| `docs/erd.dbml`                           | Entity-relationship diagram of the 21 tables, in DBML          |
| `src/lib/server/db/product.schema.ts`     | Product tables, enums, constraints and indexes used by the app |

The original design schema has been retired. The product schema above is what the running code uses;
`docs/contracts/invariants.ts` is the transaction specification.

**The API contract is provisional.** `docs/contracts/openapi.yaml` describes the intended API, but
response shapes and error details may change as handlers land. When behavior and the contract
differ, change the contract deliberately and record why; do not contort the code to match a draft
schema. `docs/contracts/implementation-status.md` lists what exists.

## Current state

- The app is still the `sv create` scaffold: default landing page and Better Auth demo routes under
  `/demo/better-auth`. The placeholder `task` table has been replaced by the product schema.
- Better Auth owns identity. `src/lib/server/db/auth.schema.ts` is generated with UUID ids, plural
  tables (`users`, `sessions`, `accounts`, `verifications`), and server-owned `role` and `status`
  fields. `pnpm auth:schema` regenerates it, then `scripts/normalize-auth-schema.mjs` converts the
  generated timestamps to `timestamptz` and the role/status text columns to PostgreSQL enums. The
  root `auth-schema.ts` is stale and unimported; do not use it.
- Authentication uses Argon2id and Resend, and requires email verification before sign-in. A real
  Resend key and a verified sender address are required for verification mail. Password reset uses
  Better Auth's one-time token and the same Resend sender; a completed reset revokes other sessions.
  The Argon2id settings and hash/verify wrappers live in `src/lib/server/password.ts`, shared by
  Better Auth and the seed script.
- `src/lib/server/db/product.schema.ts` contains the product tables: common profile/moderation
  tables, student and employer profiles, marketplace, trust, notifications, AI and audit tables.
  All user foreign keys reference the generated `users.id` as `uuid`.
- `user_profiles` is created eagerly in the Better Auth user-create hook. `user_moderation` is
  created lazily through `ensureUserModeration` on the first failed login or admin action; a missing
  row means zero failures and no lock.
- `src/lib/server/db/schema.ts` only re-exports the auth and product schemas; Drizzle and
  drizzle-kit consume that aggregate.
- `scripts/seed.ts` (run with `pnpm db:seed`) inserts fixed-id development data: an admin, three
  students (An, Linh and Minh) and three employers (Acme Coffee, Hanoi Study Hub and Saigon Event
  Crew), 22 categories, seven locations, 34 jobs, 12 applications, three reviews, two signed work
  records, five notifications and five reports. Most jobs are hiring; one is completed so the
  review and work-record pages have data, and the flagged and hidden jobs feed the moderation
  queue. The three students have profiles and pending applications to the barista job. Some jobs
  belong to the two extra employers and carry recent applications so the home page's featured
  ranking has variety. The seed is idempotent, re-signs the demo work records when
  `WORK_RECORD_SECRET` changes, uses `SEED_PASSWORD` (default `Password123!`), and refuses to run
  when `NODE_ENV=production`.
- Migrations through `drizzle/0007_majestic_the_fury.sql` have been generated and applied; all 22
  tables exist. Auth timestamps are `timestamptz`, and `users.role` / `users.status` are PostgreSQL
  enums.
- The `/api/v1` route tree exists under `src/routes/api/v1` (54 paths, 69 operations). The account,
  notification, saved-job, application, own-profile, job read/write, review, admin and trust
  operations are implemented; the AI reads and the shareable work-record card still return `501`.
  Shared API helpers live in `src/lib/server/api/`; services live in `src/lib/server/services/`.
  Authentication endpoints are Better Auth's `/api/auth/*` and deliberately not duplicated under
  `/api/v1`. See `src/routes/api/README.md` for route conventions and the implementation checklist.
- Application writes copy the profile CV onto the application and create an in-app notification; the
  matching email is sent after the transaction commits through
  `src/lib/server/email-notifications.ts`.
- Transactional email has one Resend sender (`src/lib/server/email.ts`) and one pure template
  (`src/lib/server/email-template.ts`). Every notification type maps to an email sender; delivery
  failures are logged and never fail the request, and tests skip the provider. There is no outbox,
  retry or opt-out yet. See `docs/decisions/email-delivery.md`.
- Work-record signatures are HMAC-SHA256 over canonical JSON with sorted keys. The helpers live in
  `src/lib/server/work-record-signature.ts`; the secret is `WORK_RECORD_SECRET`. `createReview`
  signs the employer-to-student record in the same transaction as the review.
- Avatar URLs are application-served; uploaded avatars live in the private bucket and are never
  returned as raw storage or presigned URLs. See `docs/decisions/avatar-storage.md`.
- `.env` exists locally and `node_modules` is installed.
- Docker Compose provides Postgres, MinIO, and a one-shot `minio-init` job that creates the
  `${S3_BUCKET:-internery-staging}` bucket. MinIO uses the Chainguard image because the upstream
  community images were removed from Docker Hub and Quay in 2025.
- Product services and API handlers cover phases 0 to 3. The frontend lives in the `(app)` route
  group under `src/routes/(app)`; `src/routes/api` stays outside it. The home page, job browsing,
  applications, saved jobs, the employer job list and applicant review, notifications, sign-in,
  personal details in both profile editors, avatar and CV uploads, employer job editing, the review
  flow, employer verification and the public work-record directory and verify pages work against
  the API. The home page pitches the marketplace with a hero, computed featured shifts
  (`sort=featured`), category shortcuts, a three-step explanation and an employer call to action.
  The
  employer job workspace at `/employer/jobs/[jobId]` has Overview, Applicants and Edit tabs; closing
  applications moves the job from `HIRING` to `CLOSED` without changing the position counts. The admin
  area (overview, users, moderation, categories, verification) is implemented, and students can
  report a job from the job page and publish or hide their work records from `/me/work-records`.
- Seed data for the moderation demo: the retail job is flagged by the scam scan and has two open
  reports, and the event job is auto-hidden with three. The admin queue shows both with their
  causes, and restoring or clearing a flag resolves the reports.
- File retention and garbage collection are agreed but **not implemented**. See
  `docs/decisions/data-retention.md` for the reference-aware cleanup policy and open decisions.
- `Dockerfile` builds a production image with adapter-node. The `app` service in
  `docker-compose.yaml` sits behind the `demo` profile, so the normal dev stack is unchanged:
  `docker compose --profile demo up -d --build app` serves the app on `:3000` next to the dev
  server. `APP_ORIGIN` is both the Better Auth base URL and the trusted SvelteKit origin, so it must
  match the demo address and requires a rebuild when it changes.

## Commands

```sh
pnpm dev                 # Vite dev server
pnpm build               # production build
pnpm check               # svelte-kit sync + svelte-check
pnpm test                # vitest run; database tests are skipped
pnpm test:db             # vitest run against .env.test (internery_test)
pnpm lint                # prettier --check + eslint
pnpm format              # prettier --write
pnpm db:start            # docker compose up (Postgres :5432, MinIO :9000/:9001)
pnpm db:generate         # drizzle-kit generate
pnpm db:migrate          # drizzle-kit migrate
pnpm db:seed             # insert development data (requires .env)
pnpm db:push             # drizzle-kit push (prototyping only)
pnpm db:studio           # drizzle-kit studio
pnpm auth:schema         # regenerate Better Auth tables into src/lib/server/db/auth.schema.ts
```

```sh
docker compose --profile demo up -d --build app   # production-style demo on :3000
docker compose --profile demo logs -f app
docker compose --profile demo stop app
```

Env vars are declared in `src/env.ts` and read from `$app/env/private` in server code:
`DATABASE_URL`, `ORIGIN`, `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
`RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `WORK_RECORD_SECRET`.
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
- Tailwind 4 utilities; the CSS entry point is `src/routes/(app)/layout.css`.
- `resolve()` takes a base-relative pathname without a leading slash (`resolve('jobs')`,
  `resolve('')` for home). A leading slash means a route ID, which includes the `(app)` group.
- Keep API field names, enum values and length limits aligned with `docs/contracts/openapi.yaml`.
- Money is an integer VND amount. Timestamps are `timestamptz`; job dates are `date`.

## Domain map

| Group       | Tables                                                          |
| ----------- | --------------------------------------------------------------- |
| Identity    | Contract: `users`, `user_tokens`; app: Better Auth tables       |
| Profiles    | `student_profiles`, `employer_profiles`                         |
| Marketplace | `categories`, `locations`, `jobs`, `applications`, `saved_jobs` |
| Trust       | `reviews`, `reports`, `verification_requests`, `work_records`   |
| Engagement  | `notifications`                                                 |
| AI          | `ai_consents`, `ai_explanations`, `ai_usage`                    |
| Audit       | `audit_logs`                                                    |

Rules that must be enforced in transactions (`docs/contracts/invariants.ts`), never by ad-hoc writes:

- `acceptApplication` / `rejectApplication` — capacity, row lock on the job, auto-`FILLED`.
- `changeJobStatus` — `HIRING → FILLED → COMPLETED`, `HIRING → CLOSED`, `CLOSED|FILLED → COMPLETED`,
  `HIRING|CLOSED|FILLED → CANCELLED`; terminal states final. `closeJob` stops applications early
  without filling the remaining positions and notifies pending applicants only.
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

The product schema therefore no longer matches the original design SQL, which was generated with
`casing: 'snake_case'`. Treat the design SQL as a reference for constraints and indexes, not as the
source of the app migration.

## Known issues to settle before implementation

See `.agents/schema-review.md` for evidence and proposed patches.

**Documentation portability:** contracts, decisions and the roadmap live in `docs/`.
`docs/contracts/openapi.yaml` is the published contract,
`docs/contracts/implementation-status.md` is the per-operation checklist, and
`docs/contracts/invariants.ts` is the transaction specification. The original design schema has been
retired. The current contract is 69 operations on 54 paths.

The identity conflict is resolved in favour of Better Auth: the app uses the generated `users`,
`sessions`, `accounts` and `verifications` tables. The contract's `users` and `user_tokens` tables
were not ported; every user foreign key points at `users.id` as `uuid`, and `password_hash`
responsibilities live in `accounts.password`. Common profile fields are in `user_profiles`; lockout
and admin-lock fields are in `user_moderation`.

Other findings: the student CV check only guards two of four CV columns; rating recalculation can
race across jobs; a withdrawn application cannot be re-submitted because the uniqueness constraint is
unconditional; several `text` columns are stricter in the API than in the DB; hidden-state and
verification-status fields can drift from their status flags.

## Working agreements

- Do not invent contract details. If a decision is missing, write it down and ask.
- Prefer the readable version even when a shorter version exists. Before finishing, reread the diff
  for names, nesting, comments and whitespace.
- Copy contract files into `src/` deliberately. Publish durable documentation in `docs/` and keep
  agent notes in `.agents/`, which is committed.
- Run `pnpm check`, `pnpm test`, and `pnpm lint` before calling work finished.
- Keep diffs focused; do not reformat unrelated files.
