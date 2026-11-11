# Schema review: the database contract

Reviewed 2026-10-21 against the installed toolchain (`drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11,
TypeScript 6) and against `docs/contracts/openapi.yaml` and `docs/contracts/invariants.ts`.

## Verdict

The DB contract is internally consistent and valid:

- `tsc --noEmit` passes on the contract schema with the installed `drizzle-orm`.
- Regenerating with `drizzle-kit generate --dialect postgresql --schema <contract schema> --out ... --casing snake_case`
  produces SQL **byte-identical** to the baseline SQL. There is no drift between the Drizzle schema
  and the checked-in migration.
- All 10 enums exposed by the API have the same values as their DB enums. The 14 notification types
  match exactly. `token_type` and `report_status` exist only in the DB, as expected.
- Every API `maxLength` that maps to a `varchar` matches the column length (email 255, fullName 120,
  phone 20, university/major 160, orgName 200, address 300, contactPhone 20, category name 100,
  job title 200, job location 300, application message 1000, reject reason 500, review comment 500,
  report reason 500, verification website 500, contact 300, hidden/lock reason 500, CV name 255).

The issues below are gaps or risks, not evidence that the contract is wrong. Two are worth fixing
before the schema is ported; the rest are decisions or service-layer responsibilities.

## What the schema contains

17 tables, 12 enums, 24 explicit indexes (4 unique), plus 5 table-level `UNIQUE` constraints and 2
composite primary keys.

| Group       | Tables                                                        | Notes                                                                                   |
| ----------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Identity    | `users`, `user_tokens`                                        | UUID ids, case-insensitive email, lockout + admin lock, one-time hashed tokens          |
| Profiles    | `student_profiles`, `employer_profiles`                       | 1:1 with users; CV storage keys; denormalised rating                                    |
| Marketplace | `categories`, `jobs`, `applications`, `saved_jobs`            | Job state, moderation flags, FTS + partial indexes, one application per student per job |
| Trust       | `reviews`, `reports`, `verification_requests`, `work_records` | Rating 1–5, no self-review, 3-report auto-hide, HMAC-signed records                     |
| Engagement  | `notifications`                                               | 14 typed events, deep links to job/application                                          |
| AI          | `ai_consents`, `ai_explanations`, `ai_usage`                  | Consent, cached explanations keyed by CV hash, 10/day quota counter                     |
| Audit       | `audit_logs`                                                  | Append-only by convention; actor nullable for system actions                            |

Key DB-enforced rules:

- `lower(email)` unique; category names case-insensitively unique.
- One application per `(job, student)`; one review per `(job, reviewer, reviewee)`; one report per
  `(job, reporter)`; one work record per `(job, student)`.
- `positions_needed >= 1`, `salary_amount > 0`, `end_date > start_date`, `rating BETWEEN 1 AND 5`,
  no self-review, CV size 1..5 MiB, public work record requires `published_at`.
- One `PENDING` verification request per employer (partial unique index).
- Listing indexes cover `status = 'HIRING' AND NOT is_hidden`; GIN index over
  `to_tsvector('simple', title || ' ' || description)`.

Service-enforced rules: capacity/auto-fill, job state machine, auto-hide, participant checks,
rating recalculation, work-record signing, notification fan-out. See `docs/contracts/invariants.ts`.

## Findings

Status update 2026-11-11: the identity conflict, rating recalculation race and withdrawn
re-submission findings are resolved. The CV integrity check and the hidden-state field checks remain
open.

### P0 - Identity model conflicts with the scaffold (resolved 2026-10-21)

Resolved in favour of Better Auth; see `docs/decisions/better-auth-identity.md`. The options below
are kept as the decision record. The product schema has since been ported to
`src/lib/server/db/product.schema.ts`.

The contract assumes a credentials-only account system:

- `users.password_hash` is `NOT NULL`.
- `user_tokens` handles verification, password reset and email change.
- All FKs are `uuid` pointing at `users.id`.

The scaffold uses Better Auth, whose generated `auth-schema.ts` defines `user`, `session`, `account`
and `verification` tables with **text** ids, and no password column on `user` (the hash lives in
`account.password`).

Impact: you cannot finalise `users` FKs, `hooks.server.ts`, or any account endpoint until this is
decided. `src/lib/server/db/auth.schema.ts` is still a stub, so the current runtime has no auth
tables at all.

**Resolved 2026-10-21:** the app uses the generated Better Auth tables with UUID ids. The contract's
`users` and `user_tokens` were not ported. The baseline migration has been applied.

Options, roughly in order of least churn:

1. **Better Auth owns identity.** Use Better Auth's `user` table as the account record, add domain
   fields (`role`, `status`, `phone`, lock fields) as additional fields or a 1:1 `user_profiles`
   table, and change every domain FK from `uuid` to `text` referencing `user.id`.
2. **Keep `users` and adapt Better Auth to it.** Configure Better Auth model/field mapping to the
   `users` table. Riskier: Better Auth assumes string ids and its own column set; this needs a
   custom adapter and careful testing.
3. **Drop Better Auth for a credentials-only stack** that matches the contract (`password_hash`,
   `user_tokens`). This is the smallest schema change but the largest framework change.

Do not guess. This choice affects every table before migrations are generated.

### P1 — CV integrity check guards only two of four columns

`student_profiles` has `cv_key`, `cv_file_name`, `cv_mime_type`, `cv_size_bytes`. The check is:

```sql
CHECK ((cv_key IS NULL) = (cv_file_name IS NULL))
```

That allows states like `cv_key` set with `cv_mime_type = NULL` and `cv_size_bytes = NULL`, while
the API's `CvInfo` requires `fileName`, `mimeType` and `sizeBytes`. A profile can therefore look valid
to the DB but be unpresentable through the API, and clearing a CV can leave orphan metadata.

Proposed fix (all four move together):

```sql
CHECK (
  (cv_key IS NULL AND cv_file_name IS NULL AND cv_mime_type IS NULL AND cv_size_bytes IS NULL)
  OR
  (cv_key IS NOT NULL AND cv_file_name IS NOT NULL AND cv_mime_type IS NOT NULL AND cv_size_bytes IS NOT NULL)
)
```

Service rule: when replacing or deleting a CV, update or null all four columns in one statement.

### P1 — Rating recalculation can lose updates (resolved 2026-11-11)

`recalcRating` reads `avg(rating)` and `count()` for the reviewee, then updates the profile. It does
not lock the profile row. Reviews are serialised per job (the job row is locked), but the same student
can be reviewed in two different jobs concurrently. Both transactions can read the same average
before either commits; the later update overwrites the earlier one. `rating_count` can also drift.

Resolved: `createReview` and the admin review-removal path lock the reviewee's user row before
calling `recalculateUserRating`; the lock, read and write run in one transaction.

Proposed fix (kept as the rationale): lock the target profile row before computing, e.g.

```ts
await tx.select().from(s.studentProfiles).where(eq(s.studentProfiles.userId, userId)).for('update');
// same for employerProfiles
```

or compute the average inside a single `UPDATE ... SET rating_avg = (SELECT avg(...))` statement.
Do this in both `createReview` and the admin hide-review path. A simpler alternative is to serialise
all rating writes on the user row (`SELECT ... FROM users WHERE id = $1 FOR UPDATE`).

### P2 — Withdrawn applications can never be re-submitted (resolved 2026-11-11)

Resolved: `applyToJob` revives a withdrawn row in place, resetting the status, message, CV snapshot
and decision timestamp instead of inserting a second row.

`UNIQUE(job_id, student_id)` is unconditional, so a student who withdraws cannot apply again to the
same job. Whether that is correct depends on AC-12.3 ("no duplicate applications"). If re-application
after withdrawal is allowed, replace the constraint with a partial unique index:

```sql
CREATE UNIQUE INDEX applications_active_uq
  ON applications (job_id, student_id)
  WHERE status <> 'WITHDRAWN';
```

This is a product decision, not a bug. Decide before writing the apply/withdraw service.

### P2 — Hidden-state fields can disagree with their flags

Nothing enforces the relationship between a state flag and its metadata:

- `jobs.is_hidden = true` with `hidden_at IS NULL` (and `hidden_reason` null).
- `reviews.is_hidden = true` with `hidden_at IS NULL`.
- `verification_requests.status = 'REJECTED'` with no `reject_reason`.
- `employer_profiles.verification_status = 'VERIFIED'` with `verified_at IS NULL`.
- `employer_profiles.verification_status` disagreeing with the latest verification request.

The service sets these fields together today. Add `CHECK` constraints for the first two if you want
the DB to reject partial writes; the rest are cross-row rules that belong in one transaction.

### P2 — Job deletion wording vs FK behaviour

The API says `DELETE /jobs/{jobId}` "cascades to pending applications" and is rejected when any
application is `ACCEPTED`. The FKs cascade **all** applications on the job (pending, rejected,
withdrawn) and restrict `reviews` and `work_records`. Since accepted applications are blocked by the
service, the practical result matches the API, but the description is imprecise. Either say "cascades
to non-accepted applications" or filter explicitly in the delete transaction.

### P2 — API is stricter than the DB for free-text fields

`availability` (API 500), `bio` (2000), employer `description` (2000) and each `skills` item (50,
max 30 items) are plain `text` / `text[]` in the DB. Direct SQL or a future import path can store
values the API rejects. This is acceptable if the API is the only writer. Otherwise use `varchar`
and a check on `array_length(skills, 1) <= 30`.

### P3 — Other service-owned invariants to remember

- `users.email_verified_at` does not update `users.status`; verification must set both.
- `users.locked_until` (temporary 5-failure lockout) is separate from `status = 'LOCKED'` (admin
  lock). API codes `TOO_MANY_ATTEMPTS` and `ACCOUNT_LOCKED` must map accordingly.
- `user_tokens.new_email` has no case-insensitive uniqueness; check `users` before use.
- Withdrawing AI consent must delete `ai_explanations` rows (README AC-38.3); no FK does this.
- `reports` counts only `OPEN` rows toward the 3-report threshold, so resolving reports resets the
  count. This matches the restore flow but should be intentional.
- `work_records.payload` duplicates row columns; only the payload is signed. Keep
  `payload.recordId = work_records.id` and treat the payload as immutable.
- `audit_logs` is append-only by convention; there is no trigger preventing updates/deletes.
- `updated_at` uses Drizzle `$onUpdate`, which only runs through Drizzle. Raw SQL must set it.
- Search must use the same expression as the GIN index:
  `to_tsvector('simple', title || ' ' || description) @@ <query>`.
- `end_date > start_date` forbids one-day jobs (README open question 1).
- Vietnamese search is accent-sensitive with the `simple` config (README open question 2).
- `reviews` and `work_records` use `ON DELETE restrict` for users/jobs; account deletion is not
  supported by the current model.

## Porting checklist

1. **Done** — identity model: Better Auth owns `users`; `user_tokens` was not ported.
2. **Done** — casing: product columns use Drizzle's default camelCase; no `casing` option.
3. **Done** — `src/lib/server/db/product.schema.ts` holds the product tables; `schema.ts` re-exports
   auth and product schemas; the `task` placeholder is gone.
4. **Partly done** — baseline migration `drizzle/0000_pink_thundra.sql` was generated and applied.
   The CV check fix (P1) and agreed P2 constraints are still open.
5. Copy `invariants.ts` into a server service module; pass the Drizzle `db` and adapt imports.
6. Build `/api/v1` against `openapi.yaml`; keep error codes and length limits in sync.
7. Add a service test for concurrent accepts and concurrent reviews once a real Postgres is available
   (PGlite serialises everything and cannot prove row locking).
8. Implement file retention and garbage collection per `docs/decisions/data-retention.md` when the
   storage service and CV/avatar upload endpoints are built.
