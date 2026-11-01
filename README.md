# Internery

A part-time job marketplace for students and employers. Students build a profile and CV, browse
jobs, apply, and collect signed work records. Employers post jobs, review applicants, and manage
hiring. Admins handle moderation and verification.

The interface uses English identifiers and API fields. Vietnamese product copy is planned.

## Status

Early development. What exists:

- Better Auth identity with email verification, Argon2id and database sessions
- PostgreSQL schema for profiles, jobs, applications, reviews, reports, notifications, AI data,
  work records and audit logs
- Drizzle migrations applied to the local database
- SvelteKit `/api/v1` route tree for the whole API contract; the foundation and the first reads and
  writes are implemented

Not implemented yet:

- Remaining API handlers and the marketplace service layer
- UI beyond the SvelteKit demo pages
- Object storage upload/download endpoints
- File retention and garbage-collection jobs
- Production deployment adapter

## Stack

- SvelteKit 3 and Svelte 5 (runes only)
- Tailwind CSS 4
- Better Auth
- Drizzle ORM and PostgreSQL
- MinIO locally, S3-compatible storage in production
- Resend for transactional email
- pnpm

## Requirements

- A current Node.js release (22 or newer)
- pnpm 10 or newer
- Docker Desktop or another Docker runtime for PostgreSQL and MinIO

## Quick start

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Create the local environment file:

   ```sh
   cp .env.example .env
   ```

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Fill in the environment values described below.

4. Start PostgreSQL and MinIO:

   ```sh
   pnpm db:start
   ```

   `db:start` runs in the foreground. Use a second terminal, or run
   `docker compose up -d` if you want it detached.

5. Apply the database migrations:

   ```sh
   pnpm db:migrate
   ```

6. Seed development data:

   ```sh
   pnpm db:seed
   ```

   This creates an admin, a student and an employer, plus categories, jobs, applications and
   notifications. The accounts share the password from `SEED_PASSWORD`, which defaults to
   `Password123!`. The script is safe to rerun and refuses to run when `NODE_ENV=production`.

7. Start the development server:

   ```sh
   pnpm dev
   ```

   Open <http://localhost:5173>.

The Compose stack exposes:

- PostgreSQL on `localhost:5432`
- MinIO S3 API on `localhost:9000`
- MinIO console on `localhost:9001`

`minio-init` creates the `${S3_BUCKET:-internery-staging}` bucket on first start.

## Environment

The application reads these variables through `src/env.ts` and `$app/env/private`:

| Variable               | Purpose                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string. The Compose default is `postgres://internery:internery@localhost:5432/internery`. |
| `ORIGIN`               | Application origin, for example `http://localhost:5173`.                                                        |
| `BETTER_AUTH_SECRET`   | Secret used to sign Better Auth tokens. Use at least 32 random characters.                                      |
| `GITHUB_CLIENT_ID`     | GitHub OAuth client ID.                                                                                         |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret.                                                                                     |
| `RESEND_API_KEY`       | Resend API key for verification and transactional email.                                                        |
| `EMAIL_FROM_ADDRESS`   | Verified Resend sender, for example `Internery <no-reply@example.com>`.                                         |

Generate `BETTER_AUTH_SECRET` with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

The GitHub OAuth callback URL is:

```text
http://localhost:5173/api/auth/callback/github
```

Email/password registration requires email verification. A real Resend key and a verified sender
address are needed to complete signup. Without them, an account can be created but cannot finish
verification.

The `.env.example` file also contains the MinIO root credentials and bucket name used by Docker
Compose. The application storage client is not wired yet.

## Authentication

Better Auth owns authentication under `/api/auth/*`.

- There is intentionally no `/api/v1/auth/*` surface.
- Protected `/api/v1` operations use the Better Auth session cookie.
- Roles are `STUDENT`, `EMPLOYER` and `ADMIN`.
- Account states are `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `LOCKED` and `DELETED`.
- Passwords use Argon2id.
- GitHub OAuth is configured; GitHub accounts with a verified email start as `ACTIVE`.

The generated Better Auth schema is `src/lib/server/db/auth.schema.ts`. Regenerate it with:

```sh
pnpm auth:schema
```

That command also normalises the generated schema to `timestamptz` and PostgreSQL enums. Do not
hand-edit the generated file.

## Database

The Drizzle schema is split into:

```text
src/lib/server/db/
  auth.schema.ts       # generated Better Auth tables
  product.schema.ts    # application tables and enums
  schema.ts            # aggregate export used by Drizzle and drizzle-kit
  index.ts             # shared postgres.js client
```

Auth tables use snake_case column names because Better Auth declares them explicitly. Product tables
use camelCase columns because the project does not set a Drizzle casing option.

Common commands:

```sh
pnpm db:generate     # generate the next migration after a schema change
pnpm db:migrate      # apply pending migrations
pnpm db:seed         # insert the development seed data
pnpm db:studio       # inspect the database
pnpm db:push         # prototyping only; skips migration history
```

The seed script lives in `scripts/seed.ts`. It uses fixed ids and conflict-safe writes, so running
it again updates the seed rows instead of duplicating them. Seed accounts use the password from
`SEED_PASSWORD`, defaulting to `Password123!`.

Review generated SQL before applying it. Migrations and their snapshots under `drizzle/` are part of
the repository and must be committed.

## API

The API lives under `src/routes/api/v1`. The route tree covers 51 paths and 65 operations. The
request foundation and the first reads and writes are implemented; the rest still return `501`. The
contract is [`docs/contracts/openapi.yaml`](docs/contracts/openapi.yaml), and
[`docs/contracts/implementation-status.md`](docs/contracts/implementation-status.md) lists what
exists.

- Authentication remains on Better Auth's `/api/auth/*`.
- Route conventions and the implementation checklist are in
  [`src/routes/api/README.md`](src/routes/api/README.md).
- Parameter names follow the contract: `{jobId}` becomes `[jobId]`.
- Errors use the single `{ error: { code, message, details?, requestId } }` envelope.
- Role checks are server-side; never rely on the UI.

## File storage

Files are not stored in PostgreSQL. The database stores object keys and metadata.

- CVs and avatars live in a private bucket.
- CVs are downloaded through owner/application-scoped API routes.
- Avatars are served through an application URL for public profile display.
- Raw storage URLs and presigned URLs are not returned to clients.
- Application CVs are snapshots; replacing a profile CV must not break an existing application.
- Retention and garbage collection are defined but not implemented yet.

## Scripts

| Command            | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `pnpm dev`         | Start the Vite development server.                             |
| `pnpm build`       | Build for production.                                          |
| `pnpm preview`     | Preview the production build.                                  |
| `pnpm check`       | Run SvelteKit sync and `svelte-check`.                         |
| `pnpm test`        | Run the Vitest suite. Database tests need `TEST_DATABASE_URL`. |
| `pnpm test:watch`  | Run Vitest in watch mode.                                      |
| `pnpm lint`        | Run Prettier check and ESLint.                                 |
| `pnpm format`      | Format the repository with Prettier.                           |
| `pnpm db:start`    | Start PostgreSQL and MinIO with Docker Compose.                |
| `pnpm db:generate` | Generate a Drizzle migration.                                  |
| `pnpm db:migrate`  | Apply pending Drizzle migrations.                              |
| `pnpm db:seed`     | Insert the development seed data.                              |
| `pnpm db:studio`   | Open Drizzle Studio.                                           |
| `pnpm auth:schema` | Regenerate and normalise the Better Auth Drizzle schema.       |

## Project layout

```text
src/
  lib/server/
    auth.ts                 # Better Auth configuration
    email.ts                # Resend verification sender
    moderation.ts           # lazy moderation-row helper
    api/                    # errors, validation, auth, pagination, mappers
    services/               # domain services used by route handlers
    db/                     # Drizzle schema and client
  routes/
    api/v1/                 # API route handlers
    demo/better-auth/       # scaffold auth demo
drizzle/                    # migrations and snapshots
scripts/
  normalize-auth-schema.mjs # post-generation auth schema normaliser
docker-compose.yaml         # PostgreSQL, MinIO, bucket bootstrap
```

## Before contributing

Read [`AGENTS.md`](AGENTS.md). It contains the project conventions, the schema rules and the
transactional invariants that must not be bypassed.

Run the relevant checks before opening a pull request:

```sh
pnpm check
pnpm test
pnpm build
```

## Deployment

The project still uses `@sveltejs/adapter-auto`. Choose a concrete adapter before deploying and set
the environment variables on the target platform.
