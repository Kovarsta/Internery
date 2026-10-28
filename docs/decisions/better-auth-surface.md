# Better Auth is the only authentication surface

Date: 2026-10-21

Status: accepted.

## Decision

Authentication endpoints are provided directly by Better Auth under `/api/auth/*`. There is no
`/api/v1/auth/*` facade and no separate JWT/bearer authentication layer for `/api/v1`.

- `/api/v1` protected operations use Better Auth's httpOnly session cookie.
- The OpenAPI contract no longer contains the seven auth paths or the `Auth` tag.
- The `cookieAuth` scheme now documents the Better Auth cookie.
- `bearerAuth` was removed. Bearer tokens can be added later through Better Auth's `bearer()` plugin
  if API clients need them.
- `AccountStatus` now matches the database enum:
  `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `LOCKED`, `DELETED`.
- The `/api/v1/auth/*` SvelteKit skeletons were deleted.

## Consequences

- The frontend calls Better Auth directly for register, login, logout, email verification and
  password reset.
- Better Auth's auth responses use its own envelope, not the `/api/v1` `Error` envelope.
- `/api/v1` handlers must derive the current user from the Better Auth session and enforce `x-roles`
  themselves.
- Login lockout and rate-limit responses come from Better Auth; any contract-specific status codes
  must be mapped at the boundary if needed.

## Avatar URL

Accepted. Avatars follow the same private-storage, application-served approach as CVs. See
`.agent/decisions/avatar-storage.md` for the URL shape, access policy and upload rules.
