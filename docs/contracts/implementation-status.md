# Implementation status

Base path: `/api/v1`. The contract lists 64 operations on 51 paths.

`[x]` means the handler is implemented, tested, and no longer returns `501`. `[ ]` means the skeleton
still returns `501 Not Implemented` from the shared helper. That `501` uses the internal
`NOT_IMPLEMENTED` code, which is not part of the public `ErrorCode` enum and disappears as each
endpoint is implemented.

Authentication is provided by Better Auth under `/api/auth/*` and is outside this contract.

**35 of 64 operations implemented.**

## Checklist

### Account

- [x] `GET /me` — Current user
- [x] `PATCH /me` — Edit name, phone or email
- [ ] `PUT /me/avatar` — Upload or replace the avatar image
- [ ] `GET /users/{userId}/avatar` — Download a user's uploaded avatar

### Student

- [x] `GET /me/student-profile` — Own student profile
- [x] `PUT /me/student-profile` — Create or replace the student profile
- [ ] `GET /me/cv` — Download own CV
- [ ] `PUT /me/cv` — Upload or replace the CV
- [ ] `DELETE /me/cv` — Remove the CV from the profile
- [x] `GET /me/applications` — Applications I submitted, newest first
- [x] `GET /me/saved-jobs` — Bookmarked jobs
- [x] `PUT /me/saved-jobs/{jobId}` — Bookmark a job (idempotent)
- [x] `DELETE /me/saved-jobs/{jobId}` — Remove a bookmark (idempotent)

### Jobs

- [x] `GET /me/employer-profile` — Own employer profile
- [x] `PUT /me/employer-profile` — Create or replace the employer profile
- [x] `GET /me/jobs` — My jobs with status and applicant count
- [x] `GET /categories` — Active job categories
- [x] `GET /jobs` — Search, filter and sort open jobs
- [x] `POST /jobs` — Post a job
- [x] `GET /jobs/{jobId}` — Job details
- [x] `PATCH /jobs/{jobId}` — Edit own job
- [x] `DELETE /jobs/{jobId}` — Delete own job
- [x] `POST /jobs/{jobId}/cancel` — Cancel a job
- [x] `POST /jobs/{jobId}/complete` — Mark a job completed

### Applications

- [x] `GET /jobs/{jobId}/applications` — Applicants of one of my jobs
- [x] `POST /jobs/{jobId}/applications` — Apply to a job
- [x] `POST /applications/{applicationId}/withdraw` — Withdraw a pending application
- [x] `POST /applications/{applicationId}/accept` — Accept an applicant
- [x] `POST /applications/{applicationId}/reject` — Reject an applicant
- [x] `GET /applications/{applicationId}/student-profile` — Profile of the applicant (employer view)
- [ ] `GET /applications/{applicationId}/cv` — Download the CV attached to an application

### Reviews

- [x] `POST /jobs/{jobId}/reviews` - Review the other party of a completed job
- [x] `GET /users/{userId}/reviews` — Average rating and review history of a user

### Notifications

- [x] `GET /me/notifications` — My notifications, newest first
- [x] `GET /me/notifications/unread-count` — Number for the bell badge
- [x] `POST /me/notifications/{notificationId}/read` — Mark one notification read
- [x] `POST /me/notifications/read-all` — Mark all notifications read

### Admin

- [ ] `GET /admin/users` — Search users
- [ ] `POST /admin/users/{userId}/lock` — Lock an account
- [ ] `POST /admin/users/{userId}/unlock` — Unlock an account
- [ ] `GET /admin/moderation-queue` — Jobs needing attention
- [ ] `POST /admin/jobs/{jobId}/hide` — Hide a job with a reason
- [ ] `POST /admin/jobs/{jobId}/restore` — Restore a hidden job
- [ ] `POST /admin/jobs/{jobId}/clear-flag` — Remove the scam warning after checking
- [ ] `POST /admin/reviews/{reviewId}/remove` — Remove a spam or abusive review
- [ ] `POST /admin/categories` — Add a category
- [ ] `PATCH /admin/categories/{categoryId}` — Rename or deactivate a category
- [ ] `DELETE /admin/categories/{categoryId}` — Delete an unused category
- [ ] `GET /admin/stats` — Basic platform statistics

### Trust

- [x] `GET /me/verification-request` — Latest verification request of the employer
- [ ] `POST /me/verification-request` — Ask for the Verified badge
- [ ] `GET /admin/verification-requests` — Verification queue
- [ ] `POST /admin/verification-requests/{requestId}/approve` — Approve a request
- [ ] `POST /admin/verification-requests/{requestId}/reject` — Reject a request with a reason
- [ ] `POST /jobs/{jobId}/reports` — Report a suspicious job

### AI

- [ ] `GET /me/ai/consent` — Current AI consent
- [ ] `PUT /me/ai/consent` — Grant or withdraw consent for AI to read the CV
- [ ] `GET /me/ai/suggestions` — Up to 5 suggested jobs
- [ ] `GET /jobs/{jobId}/ai/fit` — Why this job fits (or might fit) my CV

### WorkRecords

- [x] `GET /me/work-records` — My signed work records
- [ ] `PATCH /me/work-records/{recordId}` — Make a record public or private
- [ ] `GET /me/work-records/{recordId}/card` — Shareable card image
- [x] `GET /work-records` — Public directory of work records
- [x] `GET /work-records/{recordId}/verify` — Check a record's signature

## Contract changes recorded with the implementation

- A missing student or employer profile returns `200` with empty strings and default values, not
  `404`. The response schemas allow the empty `university`, `major` and `orgName` sentinels; the
  input schemas still require at least one character on save.
- Every authenticated endpoint returns `403 FORBIDDEN` or `403 ACCOUNT_LOCKED` when the account is
  locked, suspended or deleted.
- Path and query validation failures return `422 VALIDATION_ERROR` with `details[]`, in addition to
  body validation.
- The error envelope always includes `requestId`.
- `POST /me/notifications/{notificationId}/read` is idempotent and returns `404` for a notification
  that does not exist or belongs to another user.
- Saved-job writes are idempotent. Only `PUT` returns `404` (unknown job); `DELETE` succeeds even
  when the bookmark does not exist.
- `GET /me/saved-jobs` keeps closed jobs with their status and omits hidden jobs. The list is
  ordered by save time, newest first.
- `GET /me/applications` uses the employer profile `orgName` and falls back to the employer user's
  name when no profile exists. `hasCv` reflects the application's CV snapshot, not the current
  profile CV.
- `PATCH /me` updates the name and phone directly. An `email` change is delegated to Better Auth,
  which sends the verification link to the new address; the old email stays until that link is
  opened. The separate `/me/email-change/confirm` operation is removed, because confirmation lives
  under `/api/auth/*`.
- The profile `PUT` operations replace the editable fields only. CV columns, ratings and employer
  verification state are owned by other flows and are preserved.
- `GET /me/jobs` reports `applicantCount` without `WITHDRAWN` applications and `acceptedCount` with
  accepted ones. Hidden jobs stay in the list with `isHidden` and `hiddenReason`.
- `GET /jobs` excludes hidden jobs, treats `location` as a literal case-insensitive substring, and
  matches keywords with PostgreSQL `websearch_to_tsquery` over the `simple` configuration. Both sort
  orders break ties on job id so pagination is stable.
- `GET /jobs/{jobId}` omits `saved` and `myApplication` for anonymous and non-student viewers rather
  than sending defaults. Hidden jobs return `404` to everyone except the owner and admins.
- `GET /users/{userId}/reviews` computes `ratingAvg` and `ratingCount` from the visible reviews
  instead of reading the profile columns, so a hidden review never affects the summary.
- Work-record responses are built from the signed `payload`, not from joined job or user rows, so the
  card shows exactly the content that was signed.
- `WorkRecord.verifyUrl` points at `/api/v1/work-records/{recordId}/verify`; the public verify page is
  frontend work and does not exist yet.
- `GET /work-records/{recordId}/verify` returns `record: null` when the signature does not match.
  A `signatureVersion` this build cannot produce is reported as `valid: false` instead of being
  checked against the current rule.
- `GET /me/verification-request` returns `licenseUrl: null` to the owner. The signed, short-lived
  link is reserved for the admin review screen.
- Work records are signed with HMAC-SHA256 over canonical JSON with recursively sorted keys. The
  secret is `WORK_RECORD_SECRET`. Rotation is a re-sign with a bumped `signatureVersion`; old keys
  are not archived, so records issued under a removed version stop verifying by design.
- `POST /jobs` rejects an unknown or inactive category with `422 VALIDATION_ERROR` on `categoryId`
  instead of letting the foreign key surface as an internal error.
- The scam scan sets `needsReview` and `flaggedTerms` from a starter keyword list. A hit never blocks
  or hides the posting; it only queues the job for admin review. The list lives in
  `src/lib/server/services/scam-terms.ts` and needs product sign-off.
- `PATCH /jobs/{jobId}` only edits `HIRING` jobs, re-runs the scam scan, and checks a partial date
  update against the stored other bound. A non-owner gets `403`, an unknown job `404`.
- `DELETE /jobs/{jobId}` locks the job row and refuses when any application is `ACCEPTED`, returning
  `409 JOB_HAS_ACCEPTED_APPLICANTS`. Pending applications and saved bookmarks cascade.
- `POST /jobs/{jobId}/applications` snapshots the profile CV only when `attachCv` is true and a CV
  exists; a student without one can still apply. Applying to a hidden job returns `404`.
- Applying again after a withdrawal revives the withdrawn row instead of failing: the status returns
  to `PENDING` with the new message and CV snapshot, `decidedAt` is cleared, and the application sorts
  as a fresh submission. Pending, accepted and rejected applications still answer `ALREADY_APPLIED`.
- Application and job writes create in-app notifications only. Email delivery is not wired yet.
- `GET /jobs/{jobId}/applications` and `GET /applications/{applicationId}/student-profile` are
  owner-scoped: an employer who does not own the job gets `403`, not an empty list.
- `POST /applications/{applicationId}/reject` locks the application row, checks ownership before
  status, and only moves `PENDING → REJECTED`. The optional reason is stored and sent with the
  student's notification. An empty request body is treated as "no reason".
- `POST /applications/{applicationId}/accept` locks the application then the job, so concurrent
  accepts for the last position cannot both succeed. It refuses a non-`PENDING` application, a job
  that is not `HIRING`, and a full job (`POSITIONS_FULL`). The last acceptance moves the job to
  `FILLED` and notifies the remaining pending applicants.
- `POST /jobs/{jobId}/cancel` allows `HIRING` and `FILLED`, sets `cancelledAt`, and notifies pending
  and accepted students. `POST /jobs/{jobId}/complete` allows `FILLED` only, sets `completedAt`, and
  notifies accepted students. Both lock the job row and reject other transitions with `409`.
- `POST /jobs/{jobId}/reviews` locks the job, then the reviewee's user row. The user row is what
  serialises rating recalculation: two reviews of the same student on different jobs would otherwise
  each store an average that misses the other. The duplicate check runs under the same lock, so a
  repeated review is `409 ALREADY_REVIEWED` without relying on a unique-violation catch. An
  employer's review of a student also writes the signed work record in the same transaction, with
  `signatureVersion` set to the current signer version.
- The review route fails closed with `500` when `WORK_RECORD_SECRET` is missing, because a stored
  employer review would otherwise never get its work record.
