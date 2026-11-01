# Implementation status

Base path: `/api/v1`. The contract lists 64 operations on 51 paths. Operations not listed here
return `501 Not Implemented` from the shared skeleton helper. That `501` uses the internal
`NOT_IMPLEMENTED` code, which is not part of the public `ErrorCode` enum and disappears as each
endpoint is implemented.

Authentication is provided by Better Auth under `/api/auth/*` and is outside this contract.

## Implemented

| Operation                                      | Phase |
| ---------------------------------------------- | ----- |
| `GET /me`                                      | 1     |
| `GET /categories`                              | 1     |
| `GET /me/student-profile`                      | 2     |
| `GET /me/employer-profile`                     | 2     |
| `GET /me/notifications`                        | 2     |
| `GET /me/notifications/unread-count`           | 2     |
| `GET /me/saved-jobs`                           | 2     |
| `GET /me/applications`                         | 2     |
| `GET /me/jobs`                                 | 2     |
| `GET /jobs`                                    | 2     |
| `GET /jobs/{jobId}`                            | 2     |
| `GET /users/{userId}/reviews`                  | 2     |
| `GET /me/work-records`                         | 2     |
| `GET /work-records`                            | 2     |
| `GET /work-records/{recordId}/verify`          | 2     |
| `GET /me/verification-request`                 | 2     |
| `POST /jobs`                                   | 3     |
| `PATCH /jobs/{jobId}`                          | 3     |
| `DELETE /jobs/{jobId}`                         | 3     |
| `POST /me/notifications/{notificationId}/read` | 3     |
| `POST /me/notifications/read-all`              | 3     |
| `PUT /me/saved-jobs/{jobId}`                   | 3     |
| `DELETE /me/saved-jobs/{jobId}`                | 3     |
| `PATCH /me`                                    | 3     |
| `PUT /me/student-profile`                      | 3     |
| `PUT /me/employer-profile`                     | 3     |

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
