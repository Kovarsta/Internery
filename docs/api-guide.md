# API guide

How to call `/api/v1`. The exact request and response shapes live in
[`contracts/openapi.yaml`](contracts/openapi.yaml); this page explains the conventions around them.

## Base path and versioning

```text
http://localhost:5173/api/v1      local
```

Authentication endpoints are Better Auth's and live under `/api/auth/*`. Everything else in this
guide is under `/api/v1`.

The contract is provisional: shapes may change as handlers land. Update `openapi.yaml` in the same
change that changes a shape, and record why in the commit.

## Authentication

Sign-in returns a session cookie, and the cookie is the credential for every authenticated call.

```sh
# sign in and keep the cookie
curl -c cookies.txt -H 'content-type: application/json' \
  -d '{"email":"student@internery.local","password":"Password123!"}' \
  http://localhost:5173/api/auth/sign-in/email

# use it
curl -b cookies.txt http://localhost:5173/api/v1/me
```

In the browser, same-origin `fetch` sends the cookie automatically. In SvelteKit server `load`
functions, use `event.fetch` with a relative path; it forwards the incoming cookie.

Endpoints with `security: []` are public (job search, categories, avatars, work-record verify). Every
other endpoint needs a session. Roles are listed as `x-roles` on each operation.

## Errors

Successful responses return the resource or page object directly. Failures use one envelope:

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "You do not have permission to do that.",
		"details": [{ "field": "file", "message": "The image is empty." }],
		"requestId": "6f1c..."
	}
}
```

`details` appears for validation errors and points at the field. `requestId` is what to quote when
reporting a `500`; it is also printed in the server log.

| Status | Typical codes                                                             |
| ------ | ------------------------------------------------------------------------- |
| 401    | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`                                  |
| 403    | `FORBIDDEN`, `ACCOUNT_LOCKED`, `AI_CONSENT_REQUIRED`                      |
| 404    | `NOT_FOUND`                                                               |
| 409    | `ALREADY_APPLIED`, `POSITIONS_FULL`, `JOB_NOT_HIRING`, `ALREADY_REVIEWED` |
| 413    | `FILE_TOO_LARGE`                                                          |
| 415    | `INVALID_FILE_TYPE`                                                       |
| 422    | `VALIDATION_ERROR`, `PROFILE_INCOMPLETE`, `CV_UNREADABLE`                 |
| 429    | `RATE_LIMITED`, `TOO_MANY_ATTEMPTS`, `AI_RATE_LIMITED`                    |

## Pagination

List endpoints take `page` (1-based) and `pageSize` and answer:

```json
{ "items": [], "page": 1, "pageSize": 20, "total": 0 }
```

Ordering is stable and ties break on the id, so paging does not repeat or skip rows.

## Values

- **Ids** are UUID strings.
- **Money** is an integer VND amount. `salaryType` is `HOURLY`, `DAILY` or `FIXED`.
- **Dates** are `YYYY-MM-DD`; timestamps are ISO 8601 with a timezone.
- **Enums** are uppercase strings, spelled exactly as in the contract.

## Files

| Endpoint                               | Response                                                        |
| -------------------------------------- | --------------------------------------------------------------- |
| `GET /me/cv`                           | the owner's CV as an attachment, `private, no-store`            |
| `GET /applications/{applicationId}/cv` | the snapshot attached at apply time, employer or applicant only |
| `GET /users/{userId}/avatar`           | public image, versioned `?v=`, cached immutably                 |

Uploads use `multipart/form-data` with a `file` field. CVs are PDF or DOCX up to 5 MB; avatars are
PNG or JPEG up to 2 MB and are stored as 512×512 WebP.

## Caching

Personalised JSON answers with `Cache-Control: no-store`: account, applications, notifications,
saved jobs, work records, profiles and job detail (it carries `saved` and `myApplication`). Public
reads such as categories, the job list and the work-record verify endpoint are cacheable by normal
HTTP rules.

## Where to look

- [`contracts/openapi.yaml`](contracts/openapi.yaml) — the operation list and schemas.
- [`contracts/implementation-status.md`](contracts/implementation-status.md) — what is live and what
  still returns `501`.
- [`contracts/invariants.ts`](contracts/invariants.ts) — transaction rules behind the writes.
- [`decisions/`](decisions/) — storage, retention and other durable choices.
