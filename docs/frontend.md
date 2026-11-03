# Frontend guide

How the SvelteKit app is built and how it gets data. The backend is documented separately in
[`api-guide.md`](api-guide.md) and [`contracts/openapi.yaml`](contracts/openapi.yaml).

## Stack and conventions

- SvelteKit 3, Svelte 5 runes (`$props`, `$state`, `$derived`), Tailwind CSS 4, TypeScript.
- App imports go through `#lib/*` and keep the `.ts` extension.
- Server-only code lives under `src/lib/server/` and must never be imported into a component.
- Tabs, single quotes, no trailing commas, 100-column width. Run `pnpm format`.

## Route map

| Area     | Routes                                                      | Guard      |
| -------- | ----------------------------------------------------------- | ---------- |
| Public   | `/`, `/jobs`, `/jobs/[jobId]`, `/login`, `/register`        | none       |
| Account  | `/me`, `/me/profile`, `/me/applications`, ...               | session    |
| Employer | `/employer/jobs`, `/employer/jobs/new`, `/employer/profile` | `EMPLOYER` |
| Admin    | `/admin`, `/admin/users`, `/admin/moderation`, ...          | `ADMIN`    |
| Verify   | `/work-records`, `/work-records/[recordId]/verify`          | none       |

Guards live in `+layout.server.ts` files: signed-out visitors redirect to `/login`, a wrong role gets
`403` through `+error.svelte`.

## Getting data

**The UI talks to the API, not to the services.** That keeps one contract for the browser, scripts
and future external clients, and means the API's role checks and validation are exercised on every
page load.

```text
+page.server.ts   load: event.fetch('/api/v1/...')   -> page data
+page.svelte      renders data, no fetching
+page.server.ts   actions: event.fetch(...)          -> fail() / redirect
```

`event.fetch` forwards the session cookie and resolves relative paths, so a server load can call
`/api/v1/me` without building a full URL.

Planned shared modules, added with the first data page:

```text
src/lib/api/client.ts   typed apiGet/apiSend, maps the error envelope to SvelteKit errors
src/lib/api/types.ts    response types mirroring openapi.yaml
src/lib/format.ts       VND amounts, salary suffixes, dates
```

A load looks like this:

```ts
export const load: PageServerLoad = async (event) => {
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const query = new URLSearchParams({ page: String(page), pageSize: '10' });

	const jobs = await apiGet<Paged<JobSummary>>(event, `/api/v1/jobs?${query}`);

	return { jobs, page };
};
```

Error mapping:

```text
401  -> redirect(303, '/login')
403  -> error(403, message)
404  -> error(404, message)
409  -> fail(409, { message })      in an action
422  -> fail(422, { message, details })
other -> error(502, 'The API request failed.')
```

Mutations go through form actions, not client-side fetch, so the page still works without JS and the
session stays server-side. Use `use:enhance` for the progressive upgrade.

Types in `src/lib/api/types.ts` mirror the contract by hand for now. If the number of response shapes
grows, generate them from `openapi.yaml` with `openapi-typescript` instead of maintaining two copies.

## Authentication in the app

- `hooks.server.ts` loads the session into `locals.user` (`id`, `name`, `role`).
- The root layout exposes only `{ id, name, role }` to pages.
- Sign-in posts to Better Auth at `/api/auth/sign-in/email`; use a form action and redirect to the
  role's dashboard.
- Never render another user's private data from a cached response; the API marks personalised JSON
  `no-store`.

## Components

```text
src/lib/components/            shared across areas
src/lib/components/jobs/       job list, row, filters, pagination
src/lib/components/me/         account widgets
```

Rules:

- One job per component. If the name needs "and", split it.
- Every component starts with a header comment naming the route it serves and what it does not own.
- Props are typed and read with `$props()`. Derived display values use `$derived`.
- No fetching inside a component. Data arrives from the page.
- Pages compose components and keep layout; they do not grow into 300-line files.
- Formatting (money, dates) lives in `src/lib/format.ts`, not in every component.

## Design direction

The demo is meant to look like shift work, not a generic SaaS dashboard. Time is the organizing
element; listings lead with when the job happens.

| Token     | Value     | Use                                   |
| --------- | --------- | ------------------------------------- |
| paper     | `#F5F6F2` | page background                       |
| ink       | `#17211B` | body text                             |
| chalk     | `#1E5B43` | primary actions and links             |
| highlight | `#F4D35E` | one accent for availability/attention |
| warning   | `#C44536` | scam warnings and destructive actions |
| rule      | `#D8DDD6` | hairlines between rows                |

- Type: **Be Vietnam Pro** for display and body; strong weight contrast rather than a second family.
- Layout: ruled rows with a time column, not a grid of identical rounded cards.
- Motion: one orchestrated reveal per page (GSAP), and only when it helps. Respect
  `prefers-reduced-motion`; do not animate every card.
- Copy: plain verbs and sentence case. "Find a shift that fits your week", not "Discover opportunity".

Put the tokens in `src/routes/layout.css` with Tailwind's `@theme` when the first page adopts them,
so components use `bg-paper`, `text-ink` and friends instead of raw hex values.

## States

- **Empty**: say what is missing and offer the next action (clear filters, post a job).
- **Error**: use `+error.svelte`; it shows the status and message with a way home.
- **Pagination**: preserve the current filters in every link.
- **Loading**: server loads render the page with data; use `use:enhance` pending states only for
  actions.

## Accessibility

- Every input has a `<label>`.
- Visible keyboard focus, not `outline: none`.
- `aria-current="page"` on the active tab (see `AreaNav.svelte`).
- Contrast at least 4.5:1 for body text.
- Reduced motion disables the GSAP entrance.

## Commands

```sh
pnpm dev
pnpm check
pnpm build
pnpm test
pnpm lint
```

## What to read

- [`api-guide.md`](api-guide.md) — how to call the API.
- [`contracts/openapi.yaml`](contracts/openapi.yaml) — response and request shapes.
- [`contracts/implementation-status.md`](contracts/implementation-status.md) — what is live.
- [`roadmap.md`](roadmap.md) — the phase plan.
- [`decisions/`](decisions/) — storage, retention, AI and other durable choices.
- `AGENTS.md` — readability and working agreements.
