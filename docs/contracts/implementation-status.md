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
- `PATCH /me` updates the name and phone directly. An `email` change is delegated to Better Auth,
  which sends the verification link to the new address; the old email stays until that link is
  opened. The separate `/me/email-change/confirm` operation is removed, because confirmation lives
  under `/api/auth/*`.
- The profile `PUT` operations replace the editable fields only. CV columns, ratings and employer
  verification state are owned by other flows and are preserved.
