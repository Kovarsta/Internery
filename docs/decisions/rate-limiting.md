# Rate limiting

Date: 2026-11-23

Status: implemented for `/api/v1`.

## Scope

| Surface                 | Limit                                 | Owner                  |
| ----------------------- | ------------------------------------- | ---------------------- |
| `/api/v1/*`             | 60 requests/second per client address | this limiter           |
| `/api/auth/*`           | Better Auth's own window              | Better Auth            |
| AI calls                | `AI_DAILY_CALL_LIMIT` (default 10)    | `ai_usage` in Postgres |
| Pages and static assets | not limited                           | —                      |

Only the JSON API is counted. Limiting page loads or static assets would punish a normal browser
for fetching one page, and the interesting abuse targets are already covered by smaller limits:
better-auth rate-limits its own endpoints, and AI cost is bounded by the daily budget in
`src/lib/server/services/ai/usage.ts`.

A same-origin `fetch` from a page load (`event.fetch` → `event.isSubRequest`) is not a separate
request from the browser: it has no client address and would only inflate the bucket, so the hook
skips it.

## Is 60 requests per second reasonable?

As a **safety ceiling**, yes: it stops a single client from hammering the API with hundreds of
requests per second, and a human never gets close. A browser page uses a handful of API calls.

As **abuse protection for the sensitive paths**, no, and it is not meant to be:

- a login brute force is 60 guesses per second here, which is far too many; Better Auth's limiter
  and the existing lockout fields handle that;
- 60 AI calls per second would be 3,600 calls in a minute; the per-user daily budget is the real
  guard.

If a stricter bucket is ever needed, the limiter takes `{ limit, windowSeconds }` and can be
instantiated per route in `hooks.server.ts` without touching the store.

## Algorithm

Fixed window of one second, aligned to the clock:

```text
bucket = floor(now / 1000)
key    = <identifier>:<bucket>
count  = INCR key; PEXPIRE key 1000 on first hit
allowed = count <= limit
```

One Redis round trip, one integer per client per second. A fixed window can allow up to
`2 × limit` across a boundary; for a ceiling that is acceptable, and it is much cheaper than a
sorted-set sliding window.

The increment and the first-use expiry run in one Lua script (`src/lib/server/rate-limit/redis.ts`)
so two requests cannot both see `1` or leave a key without a TTL. Keys expire on their own, so the
database stays empty.

## Failure policy

The limiter **fails open**:

- a Redis error, or a check slower than 500 ms, allows the request without rate-limit headers;
- the failure is logged once a minute, not once per request;
- a missing client address (proxy not configured) logs and allows, because a deployment mistake
  should not turn into 500s for every API call.

The demo must keep serving when Redis is down. The cost is that the ceiling disappears until Redis
returns.

## Responses

Allowed requests carry:

```http
RateLimit-Limit: 60
RateLimit-Remaining: 42
```

A blocked request returns the standard error envelope and:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 1
RateLimit-Limit: 60
RateLimit-Remaining: 0

{"error":{"code":"RATE_LIMITED","message":"Too many requests. Try again shortly.","requestId":"..."}}
```

`RATE_LIMITED` was already in the contract's error list; no new code was added.

## Configuration

| Variable                | Default                  | Purpose                                     |
| ----------------------- | ------------------------ | ------------------------------------------- |
| `REDIS_URL`             | `redis://localhost:6379` | Counter store                               |
| `RATE_LIMIT_PER_SECOND` | `60`                     | Requests per client per second on `/api/v1` |

Behind a reverse proxy, adapter-node reads the client address from `ADDRESS_HEADER`; without it,
every request shares the proxy's address and therefore one bucket. Set it to the header the proxy
writes (`x-forwarded-for`) when one is added.

Compose starts Redis with the rest of the stack: `docker compose up -d redis`, or plain
`pnpm db:start`. The demo `app` service gets `REDIS_URL: redis://redis:6379`.

## Code map

| File                                   | Role                                                   |
| -------------------------------------- | ------------------------------------------------------ |
| `src/lib/server/rate-limit/limiter.ts` | Window maths and the decision type, store-injected     |
| `src/lib/server/rate-limit/redis.ts`   | Redis store with the atomic Lua script                 |
| `src/lib/server/rate-limit/index.ts`   | Env configuration, 500 ms cap, fail-open, log throttle |
| `src/hooks.server.ts`                  | Applies the limiter to `/api/v1` before Better Auth    |
| `src/lib/server/api/errors.ts`         | `createErrorResponse`, reused for the `429` body       |
