# Internery roadmap

Current scope: Phase 0 through Phase 7. Phase 8 (frontend) and Phase 9 (deployment) follow once the
backend is complete.

Ordering rule: easiest to hardest, backend before frontend. Core marketplace flows come before the
optional trust/AI/work-record extras when effort is limited. Every API endpoint is done only when
validation, auth/roles, service logic, error mapping and tests exist and the `501` skeleton is gone.

Reference files: [`contracts/openapi.yaml`](contracts/openapi.yaml) (API contract),
[`contracts/implementation-status.md`](contracts/implementation-status.md) (per-operation checklist)
and [`contracts/invariants.ts`](contracts/invariants.ts) (transaction recipes). The original design
schema was retired.

Difficulty labels are relative: **S** small, **M** medium, **L** large, **XL** extra large.

## Current position

```text
Phase 0  done      seed data and account status semantics
Phase 1  done      errors, validation, auth, pagination, mappers, tests
Phase 2  done      every read
Phase 3  done      every straightforward write
Phase 4  done      transactional core
Phase 5  now       storage
```

42 of 65 API operations are implemented. See the checklist in
[`contracts/implementation-status.md`](contracts/implementation-status.md).

## Done

- Better Auth identity: UUIDs, plural tables, email verification, Argon2id, Resend, database sessions
- `users.role` and `users.status` as PostgreSQL enums
- Auth timestamps as `timestamptz`
- Product schema: profiles, jobs, applications, reviews, notifications, trust, AI, audit
- Baseline and auth-type migrations applied
- Eager `user_profiles` creation and lazy `user_moderation`
- `/api/v1` route tree: 51 paths, 65 operations
- Private-storage, avatar, retention and auth-surface decisions recorded
- Work-record canonical JSON and HMAC helpers, used by the public verify read

## Phase 0 — minimal unblockers

Status: done. Authenticated endpoints reject `LOCKED`, `SUSPENDED` and `DELETED` with
`403 ACCOUNT_LOCKED`. Seed data is `scripts/seed.ts`, run with `pnpm db:seed`.

- **S** Decide the final status semantics for `SUSPENDED` vs `LOCKED`.
- **S** Add seed data: categories, one admin, one student, one employer, a few jobs.
- Keep the current `501` helper until each handler is implemented; no separate decision needed.

## Phase 1 — API foundation

Status: done. Error handling, validation, auth guards, pagination, response mappers, the database
types, Vitest and the two reference endpoints are in place.

- **S** Error helpers: map `DomainError` to the OpenAPI error envelope and status codes.
- **S** Validation helpers: path/query/body parsing with `422` field details.
- **S** Auth helpers: read the Better Auth session from `locals`, require a role, return `401/403`.
- **S** Pagination helpers: `page`, `pageSize`, `items`, `total`.
- **S** Response mappers: database row -> OpenAPI schema; never leak storage keys or password data.
- **M** Service module layout: one module per domain (`jobs`, `applications`, `profiles`,
  `reviews`, `notifications`, `admin`), routes stay thin.
- **M** Integration test harness against the local Postgres database.
- **M** Better Auth integration test: signup, verification, login, logout and session refresh.

## Phase 2 — easiest reads

Status: done. Every read is implemented. Work-record and review reads return empty pages until
Phase 4 creates reviews and work records, and `/work-records/{recordId}/verify` has no data to check
yet.

Decided: a missing role profile returns `200` with empty defaults; every authenticated endpoint
rejects `LOCKED`, `SUSPENDED` and `DELETED` with `403 ACCOUNT_LOCKED`.

- **S** `GET /categories`
- **S** `GET /me`
- **S** `GET /me/student-profile`
- **S** `GET /me/employer-profile`
- **S** `GET /me/notifications`
- **S** `GET /me/notifications/unread-count`
- **S** `GET /me/saved-jobs`
- **S** `GET /me/applications`
- **S** `GET /me/jobs`
- **S** `GET /me/work-records`
- **S** `GET /me/verification-request`
- **M** `GET /jobs` — search, category, location, salary and date filters, pagination
- **M** `GET /jobs/{jobId}` — public detail plus owner/admin visibility of hidden jobs
- **M** `GET /users/{userId}/reviews`
- **M** `GET /work-records`
- **M** `GET /work-records/{recordId}/verify`

## Phase 3 — straightforward writes

Status: done. Notification read/read-all, saved-job save/remove, `PATCH /me`, both profile PUTs, the
job create/edit/delete writes and the application writes are implemented with database-backed tests.
Email changes are delegated to Better Auth.

- **S** `POST /me/notifications/{notificationId}/read`
- **S** `POST /me/notifications/read-all`
- **S** `PUT /me/saved-jobs/{jobId}`
- **S** `DELETE /me/saved-jobs/{jobId}`
- **M** `PATCH /me` — name and phone; email change goes through Better Auth
- **M** `POST /me/email-change/confirm` — removed, Better Auth owns confirmation
- **M** `PUT /me/student-profile`
- **M** `PUT /me/employer-profile`
- **M** `GET /applications/{applicationId}/student-profile`
- **M** `GET /jobs/{jobId}/applications`
- **M** `POST /jobs`
- **M** `PATCH /jobs/{jobId}`
- **M** `DELETE /jobs/{jobId}` — reject when an accepted application exists
- **M** `POST /jobs/{jobId}/applications` — copy the CV snapshot, notify the employer
- **M** `POST /applications/{applicationId}/withdraw`

## Phase 4 - transactional core

Status: done. Accept, reject, cancel and complete run under row locks, and reviews recalculate the
reviewee's rating under a lock on the reviewee's user row. The employer-to-student review writes the
signed work record in the same transaction. Database-backed tests cover both concurrency races: two
accepts for the last position, and two reviews of the same student on different jobs.

These need row locks, state machines and notification fan-out.

- **M** `POST /applications/{applicationId}/accept` — capacity check, auto-`FILLED`
- **M** `POST /applications/{applicationId}/reject`
- **M** `POST /jobs/{jobId}/cancel`
- **M** `POST /jobs/{jobId}/complete`
- **M** `POST /jobs/{jobId}/reviews` — participant checks, rating recalculation
- **L** Work-record creation inside the employer-to-student review
- **M** Rating recalculation serialised by a lock on the reviewee's user row
- **M** Concurrency test: two accepts for the last position; reviews for the same student across
  different jobs

The signing and verification helpers live in `src/lib/server/work-record-signature.ts`, and
`createReview` calls the signer when it creates a record.

## Phase 5 - storage

Status: in progress. Every storage endpoint is implemented. The orphan sweep script exists; CV
expiry and the other retention jobs remain.

- **M** S3/MinIO client configuration and a `StorageService` abstraction
- **M** `PUT /me/cv` — PDF/DOCX, 5 MB, magic-byte validation, new unique key
- **M** `GET /me/cv` — owner-scoped streamed download
- **M** `DELETE /me/cv` — clear four columns, keep referenced snapshots
- **M** `GET /applications/{applicationId}/cv` — employer/owner authorization, snapshot key
- **M** `PUT /me/avatar` — PNG/JPEG, 2 MB, validation
- **M** `DELETE /me/avatar` — point `avatarKey` at the reserved blank avatar, `204`
- **S** `GET /users/{userId}/avatar` — public streamed avatar, ETag/cache headers
- **M** Reference-aware deletion and the 7-day orphan grace period
- **L** Retention jobs: application CV expiry, orphan sweep, notifications/AI/auth cleanup
- **M** Apply-vs-reupload race test

## Phase 6 — admin and trust

- **M** `GET /admin/users`
- **M** `POST /admin/users/{userId}/lock`
- **M** `POST /admin/users/{userId}/unlock`
- **M** `GET /admin/moderation-queue`
- **M** `POST /admin/jobs/{jobId}/hide`
- **M** `POST /admin/jobs/{jobId}/restore`
- **M** `POST /admin/jobs/{jobId}/clear-flag`
- **M** `POST /admin/reviews/{reviewId}/remove` — hidden review plus rating recalculation
- **M** `POST /admin/categories`
- **M** `PATCH /admin/categories/{categoryId}`
- **M** `DELETE /admin/categories/{categoryId}`
- **M** `GET /admin/stats`
- **M** `GET /admin/verification-requests`
- **M** `POST /admin/verification-requests/{requestId}/approve`
- **M** `POST /admin/verification-requests/{requestId}/reject`
- **M** `POST /jobs/{jobId}/reports` — three distinct reporters auto-hide
- **M** `POST /me/verification-request` — submit a verification request
- **M** Audit-log writes for lock, hide, restore, review removal and verification decisions

## Phase 7 — optional extras

Cut these first if time is tight.

- **S** `GET /me/ai/consent` / `PUT /me/ai/consent`
- **L** AI suggestions: CV text extraction, PII removal, quota, caching
- **L** AI fit explanation: quote verification against the CV, cache by CV hash
- **L** `GET /me/work-records/{recordId}/card` — public card image
- **M** `PATCH /me/work-records/{recordId}` — visibility update

## Phase 8 — frontend

Route skeletons exist under `src/routes`; every page still needs data loading, forms, states and
styling. Build after the backend endpoints are real and tested, easiest first.

- **S** Layout, navigation, route guards and session-aware header
- **S** Better Auth pages: register, login, verify email, resend verification, password reset
- **S** Public job list and job detail
- **S** Student profile view/edit
- **M** CV upload, replace and download
- **M** Student applications and saved jobs
- **M** Employer profile and company setup
- **M** Employer job create/edit/cancel/complete
- **M** Employer applicant list, accept/reject, applicant profile and CV download
- **M** Notifications list and unread badge
- **M** Reviews and work-record list/detail
- **M** Admin users, moderation queue, job actions and categories
- **M** Verification request and approval flow
- **L** AI suggestions and fit explanation UI
- **L** Work-record public directory, card and verification page
- **L** Responsive, accessibility, loading/error/empty states and final polish

## Phase 9 — hardening and deployment

- **M** End-to-end tests for the core student and employer journeys
- **L** Concurrency tests against real Postgres, not PGlite
- **M** Rate limits and lockout behavior wired through Better Auth and `user_moderation`
- **M** Security review: IDOR, role checks, file access, validation, error leakage
- **M** Observability: structured logs, request IDs, audit coverage
- **M** Backup/restore and retention-job monitoring
- **M** Choose a concrete SvelteKit adapter and deploy to staging
- **M** Production environment, S3 bucket policy, Resend sender verification and secrets

## Deferred maintenance

- Keep `docs/contracts/openapi.yaml` and `docs/contracts/implementation-status.md` current with each
  implemented operation. The contract is provisional; record each deliberate divergence instead of
  bending the code to match it.
- `pnpm lint` still fails on scaffold files with CRLF line endings.

## Definition of done for one endpoint

1. Contract operation understood: params, body, response, roles, errors.
2. Validation returns `422` with field details.
3. Session and role checks return `401`/`403`.
4. Business logic lives in a service function, with a transaction where required.
5. Response matches the OpenAPI schema.
6. `notImplemented()` removed.
7. Unit/integration test added for the happy path and important failure cases.
8. `pnpm check` and `pnpm build` pass.
