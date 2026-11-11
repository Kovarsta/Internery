# Better Auth owns identity

Date: 2026-10-21

## Context

The original database contract assumed a credentials-only identity model:
`users.password_hash` plus `user_tokens`. The app uses Better Auth with the Drizzle adapter. Keeping
both would duplicate the account record and force every login, verification and password-reset flow
to reconcile two sources of truth.

## Decision

Better Auth owns identity. The contract's `users` and `user_tokens` tables were not ported; the
design schema that declared them has been retired.

- UUID ids via `advanced.database.generateId: 'uuid'`.
- Plural tables via `drizzleAdapter(..., { usePlural: true })`: `users`, `sessions`, `accounts`,
  `verifications`.
- `role` and `status` are server-owned additional fields on `users`, stored as PostgreSQL enums
  (`user_role`, `account_status`).
- Passwords use Argon2id through `@node-rs/argon2`.
- Email verification is required before sign-in and is sent through Resend.
- Hybrid field split:
  - `users` — Better Auth fields plus `role`, `status`
  - `user_profiles` — phone, avatar and other common profile fields, created eagerly with the user
  - `user_moderation` — failed-login lockout and admin lock fields, created lazily on first use
  - `student_profiles` / `employer_profiles` — role-specific domain fields
- Better Auth rate limiting plus per-account lockout for NFR-16. The moderation table exists; the
  login hooks that maintain it are still to be implemented.

## Consequences

- Every product foreign key that pointed at `users.id` uses `uuid` and references the generated
  `users.id`. No FK column type changes were needed.
- `password_hash` moves to `accounts.password`; Better Auth hashes it.
- `user_tokens` is replaced by `sessions` and `verifications`.
- Better Auth's generator emits `timestamp` and `text` enum columns. `scripts/normalize-auth-schema.mjs`
  runs after every `auth generate` and rewrites the generated file to use `timestamptz` and the
  `user_role` / `account_status` PostgreSQL enums. Do not hand-edit `auth.schema.ts`; update the
  normaliser instead.
- Employer signup cannot rely on client input for `role` because `role.input` is `false`. Assign the
  employer role server-side during onboarding.
- `emailAndPassword.requireEmailVerification` is enabled. A Resend key and a verified sender address
  are required; without them, users cannot complete verification.
- `afterEmailVerification` sets `status = 'ACTIVE'` only when it is still `PENDING_VERIFICATION`, so
  a suspended or locked account is not reactivated by verifying its email.
- `databaseHooks.user.create.after` inserts the `user_profiles` row. The insert is idempotent
  (`onConflictDoNothing`) and does not create a `user_moderation` row.
- `ensureUserModeration` in `src/lib/server/moderation.ts` creates the moderation row lazily on the
  first moderation event.
- The root `auth-schema.ts` is stale and unimported; the app uses
  `src/lib/server/db/auth.schema.ts`.

## Verification

- `pnpm auth:schema` generates the schema and formats it.
- `pnpm check` passes.
- `pnpm db:generate` produced the baseline and the auth type-change migration;
  `pnpm db:migrate` applied both to the local database, creating all 21 tables with `timestamptz`
  auth timestamps and PostgreSQL enums for role/status. Later migrations added the `locations`
  table and `user_profiles.onboardedAt`; the current schema has 22 tables.
