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

- The AI suggestion and fit endpoints
- The shareable work-record card image

## Stack

- SvelteKit 3 and Svelte 5 (runes only)
- Tailwind CSS 4
- Better Auth
- Drizzle ORM and PostgreSQL
- MinIO locally, S3-compatible storage in production
- Resend for transactional email
- pnpm
- `@sveltejs/adapter-node` for the Docker demo

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

   This creates an admin, three students and an employer, plus categories, jobs, applications and
   notifications. The accounts share the password from `SEED_PASSWORD`, which defaults to
   `Password123!`. The script is safe to rerun and refuses to run when `NODE_ENV=production`.

   The seeded accounts are already verified, so they can sign in at `/login` immediately:

   | Name             | Email                      | Role       |
   | ---------------- | -------------------------- | ---------- |
   | Internery Admin  | `admin@internery.local`    | `ADMIN`    |
   | Nguyen Van An    | `student@internery.local`  | `STUDENT`  |
   | Pham Thu Linh    | `linh@internery.local`     | `STUDENT`  |
   | Hoang Quang Minh | `minh@internery.local`     | `STUDENT`  |
   | Tran Thi Binh    | `employer@internery.local` | `EMPLOYER` |

   Use `student@`, `linh@` or `minh@` for the student side, and `employer@` for the employer side.

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

## Docker demo

`Dockerfile` builds a production bundle with `@sveltejs/adapter-node`, and `docker-compose.yaml`
adds an `app` service behind the `demo` profile. Plain `docker compose up` still starts only
PostgreSQL and MinIO for development, so a running dev server on `:5173` is unaffected.

1. Apply migrations and seed data once, if the quick start has not done it yet:

   ```sh
   pnpm db:migrate
   pnpm db:seed
   ```

2. Build and start the app:

   ```sh
   docker compose --profile demo up -d --build app
   ```

   Open <http://localhost:3000>.

3. Follow the logs, or stop the app without stopping the database and MinIO:

   ```sh
   docker compose --profile demo logs -f app
   docker compose --profile demo stop app
   ```

`APP_ORIGIN` is the address people open the demo at. It becomes both Better Auth's base URL and
SvelteKit's trusted origin, so it must match exactly:

```sh
APP_ORIGIN=https://demo.example.com docker compose --profile demo up -d --build app
```

Changing `APP_ORIGIN` requires the rebuild, because SvelteKit bakes the trusted origin into the
build. `APP_PORT` changes the host port (default `3000`).

The image never contains `.env`; compose passes the variables at runtime. Adapter-node's request
body limit is raised to 10 MB so CV and verification-licence uploads (up to 5 MB) reach the API.

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
Compose.

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

## Tests and databases

`pnpm test` runs the unit tests. The database-backed tests are skipped unless `TEST_DATABASE_URL` is
set.

Use the dedicated test database, never a development or production one:

```sh
# once: create and migrate the test database
docker compose exec -T db createdb -U internery internery_test
$env:DATABASE_URL = "postgres://internery:internery@localhost:5432/internery_test"
pnpm db:migrate
Remove-Item Env:DATABASE_URL

# every run: load .env.test and run the whole suite
pnpm test:db
```

`.env.test` points `TEST_DATABASE_URL` at `internery_test`, and `pnpm test:db` loads that file. The
tests create and delete real rows, so `vitest.global-setup.ts` refuses any database whose name does
not contain `test`. Set `ALLOW_NON_TEST_DATABASE=1` only when the target is genuinely disposable.

## Scripts

| Command            | Purpose                                                     |
| ------------------ | ----------------------------------------------------------- |
| `pnpm dev`         | Start the Vite development server.                          |
| `pnpm build`       | Build for production.                                       |
| `pnpm preview`     | Preview the production build.                               |
| `pnpm check`       | Run SvelteKit sync and `svelte-check`.                      |
| `pnpm test`        | Run unit tests; database tests are skipped.                 |
| `pnpm test:db`     | Run the whole suite against `.env.test` (`internery_test`). |
| `pnpm test:watch`  | Run Vitest in watch mode.                                   |
| `pnpm lint`        | Run Prettier check and ESLint.                              |
| `pnpm format`      | Format the repository with Prettier.                        |
| `pnpm db:start`    | Start PostgreSQL and MinIO with Docker Compose.             |
| `pnpm db:generate` | Generate a Drizzle migration.                               |
| `pnpm db:migrate`  | Apply pending Drizzle migrations.                           |
| `pnpm db:seed`     | Insert the development seed data.                           |
| `pnpm db:studio`   | Open Drizzle Studio.                                        |
| `pnpm auth:schema` | Regenerate and normalise the Better Auth Drizzle schema.    |

## Project layout

```text
src/
  lib/server/
    auth.ts                 # Better Auth configuration
    email.ts                # Resend sender and verification mail
    email-template.ts       # shared HTML and text template
    email-notifications.ts  # notification type to email mapping
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
