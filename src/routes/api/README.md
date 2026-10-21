# API routes

SvelteKit route handlers for the `/api/v1` contract.

The OpenAPI document is the source of truth for paths, methods, request bodies, responses and roles.
The handlers in this directory are **skeletons**: every operation currently returns `501 Not
Implemented` until its service logic is written.

## Layout

```text
src/routes/api/v1/
  jobs/[jobId]/+server.ts
  applications/[applicationId]/cv/+server.ts
  me/notifications/[notificationId]/read/+server.ts
```

OpenAPI path parameters use braces; SvelteKit uses brackets:

```text
/jobs/{jobId}                    -> jobs/[jobId]
/applications/{applicationId}/cv -> applications/[applicationId]/cv
```

Each route file exports the HTTP methods declared in the contract:

```ts
import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /me — getMe */
export const GET: RequestHandler = () => notImplemented();
```

`notImplemented()` lives in `src/lib/server/api/not-implemented.ts`. The `501` response is a
scaffold-only response; it is not part of the API contract. Delete the call when implementing a
handler.

## Authentication

Better Auth owns authentication and exposes its endpoints under `/api/auth/*`. There is deliberately
no `/api/v1/auth/*` surface.

- Protected handlers read the Better Auth session from `event.locals`, populated in
  `src/hooks.server.ts`.
- `x-roles` in the OpenAPI contract says which roles may call an operation. Enforce it server-side;
  never rely on the UI.
- Operations with `security: []` are public.
- Operations with `security: [{}, ...]` work signed-out and may add personal fields when signed in.
- Bearer tokens are not enabled. Add Better Auth's `bearer()` plugin before accepting
  `Authorization: Bearer` requests.

## Responses and errors

Successful responses must match the OpenAPI schemas. Error responses should use one envelope:

```json
{
	"error": {
		"code": "INVALID_STATE_TRANSITION",
		"message": "Human-readable explanation",
		"details": []
	}
}
```

Validation failures should be `422` with `details[]` naming each field. Do not return framework
error pages from API routes.

## Files

CVs and avatars live in the private object bucket; the database stores only keys and metadata.
Downloads are served through application routes:

- `GET /me/cv`
- `GET /applications/{applicationId}/cv`
- `GET /users/{userId}/avatar`

Do not return raw bucket URLs or presigned URLs. The API owns the URL and checks access before
streaming the object. CV downloads are owner/application-scoped; avatars are public profile data.

## Implementing a handler

1. Find the operation in the OpenAPI contract by path and method.
2. Validate path parameters, query parameters and the request body.
3. Check the session and `x-roles`.
4. Call the service function; do not put multi-table business rules in the route handler.
5. Return the schema declared by the contract.
6. Remove the `notImplemented()` call.
7. Run `pnpm check` and the relevant tests.

Transactional rules such as accept/reject capacity, job state transitions, auto-hide and review
ratings belong in the service layer behind the route, not in `+server.ts`.

## Verification

```sh
pnpm check    # SvelteKit sync + svelte-check
pnpm build    # production build
pnpm lint     # Prettier + ESLint
```

The OpenAPI contract can be linted with:

```sh
npx @redocly/cli lint .tmp/openapi.yaml
```
