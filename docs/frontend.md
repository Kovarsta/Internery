# Frontend guide

How the SvelteKit app is built and how it gets data. The backend is documented separately in
[`api-guide.md`](api-guide.md) and [`contracts/openapi.yaml`](contracts/openapi.yaml).

## Stack and conventions

- SvelteKit 3, Svelte 5 runes (`$props`, `$state`, `$derived`), Tailwind CSS 4, TypeScript.
- shadcn-svelte for controls (`button`, `input`, `label`, `checkbox`, `native-select`, `textarea`,
  `alert`, `badge`). Generated files live in `src/lib/components/ui/` and are owned by the project,
  so they are formatted like the rest of `src/`.
- App imports go through `#lib/*` and keep the `.ts` extension.
- Server-only code lives under `src/lib/server/` and must never be imported into a component.
- Tabs, single quotes, no trailing commas, 100-column width. Run `pnpm format`.

## Route map

| Area     | Routes                                                                           | Guard      |
| -------- | -------------------------------------------------------------------------------- | ---------- |
| Public   | `/`, `/jobs`, `/jobs/[jobId]`, `/login`, `/register`                             | none       |
| Account  | `/me`, `/me/profile`, `/me/applications`, ...                                    | session    |
| Employer | `/employer/jobs`, `/employer/jobs/new`, `/employer/jobs/[jobId]/applicants`, ... | `EMPLOYER` |
| Admin    | `/admin`, `/admin/users`, `/admin/moderation`, ...                               | `ADMIN`    |
| Verify   | `/work-records`, `/work-records/[recordId]/verify`                               | none       |

Guards live in `+layout.server.ts` files: signed-out visitors redirect to `/login`, a wrong role gets
`403` through `+error.svelte`.

Every page route lives in the `(app)` route group, which does not add a URL segment. It holds the
shared layout, the error page and the stylesheet, so `src/routes` only has two children:

```text
src/routes/(app)/     the rendered app: layout, stylesheet, and every page
src/routes/api/       the JSON API, outside the app layout
```

The API deliberately sits outside `(app)`: it must not inherit the HTML shell or the navigation
header. Route URLs are unchanged (`/jobs`, not `/(app)/jobs`).

`resolve` takes a pathname relative to the base, without a leading slash: `resolve('jobs')` and
`resolve('')` for the home page. In SvelteKit 3 a leading slash means a route ID, and route IDs
include the group name, so `resolve('/jobs')` does not type-check once the routes live in `(app)`.
Build links with parameters as pathnames too, for example
``resolve(`jobs/${encodeURIComponent(job.id)}`)``.

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
src/lib/api/client.ts        server: apiGet + error envelope -> SvelteKit errors
src/lib/api/browser.ts       browser: apiSend -> { ok, data } | { ok, message }
src/lib/api/error-message.ts reads the error envelope for both
src/lib/api/types.ts         response types mirroring openapi.yaml
src/lib/format.ts            VND amounts, salary suffixes, dates
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

Mutations use one of two patterns:

- **Form action** for a whole-page flow (sign in, register, publish a job). It works without
  JavaScript and returns `fail(...)` with the API's message, which the page renders in an `Alert`.
- **Browser write** for an in-page action (apply, save, withdraw, accept an applicant). `apiSend`
  returns the error instead of throwing, so the component can show a toast and call `refreshAll()`
  to reload the server data. Use this when staying on the page is the point.

`use:enhance` is optional; these forms already return server-rendered state.

## Toasts

`src/routes/(app)/+layout.svelte` mounts one `<Toaster>` from `svelte-french-toast`. Use
`showSuccess` / `showError` from `src/lib/toast.ts`, which apply the ink surface and the type accent;
do not call the library directly from components. Toasts are supplementary; the page must still show
the state after a reload.

Toasts are for write results (applied, saved, withdrawn, accepted, rejected, signed in), never for
validation errors that belong next to a field. A navigation-level confirmation that must survive
without JavaScript stays an `Alert`.

Types in `src/lib/api/types.ts` mirror the contract by hand for now. If the number of response shapes
grows, generate them from `openapi.yaml` with `openapi-typescript` instead of maintaining two copies.

## Authentication in the app

- `hooks.server.ts` loads the session into `locals.user` (`id`, `name`, `role`).
- The root layout exposes only `{ id, name, role }` to pages.
- Sign-in and registration are form actions in `src/routes/(app)/login/+page.server.ts` and
  `src/routes/(app)/register/+page.server.ts`. They call Better Auth's `auth.api`, and the
  `sveltekitCookies` plugin writes the session cookie. The server assigns the signup role.
- Never render another user's private data from a cached response; the API marks personalised JSON
  `no-store`.

### Demo accounts

`pnpm db:seed` creates verified accounts with the `SEED_PASSWORD` password (default
`Password123!`):

| Name             | Email                      | Role       |
| ---------------- | -------------------------- | ---------- |
| Internery Admin  | `admin@internery.local`    | `ADMIN`    |
| Nguyen Van An    | `student@internery.local`  | `STUDENT`  |
| Pham Thu Linh    | `linh@internery.local`     | `STUDENT`  |
| Hoang Quang Minh | `minh@internery.local`     | `STUDENT`  |
| Tran Thi Binh    | `employer@internery.local` | `EMPLOYER` |

All three students have profiles and pending applications to the barista job, so the employer
applicant list has several rows for accept/reject demos. One seeded job is completed, with reviews
and two signed work records: An's record is private and Linh's is public, so the directory, the
verify page and both states of `/me/work-records` have data. The employer has one approved
verification request, so `/me/verification` shows a filled-in outcome.

## Components

```text
src/lib/components/            shared across areas
src/lib/components/ui/         generated shadcn-svelte controls
src/lib/components/home/       landing hero and category shortcuts
src/lib/components/jobs/       job list, row, filters, actions, pagination
src/lib/components/applications/  one application row with its withdraw action
src/lib/components/employer/   employer job row and applicant row with accept/reject
src/lib/components/work-records/  public record card and the owner's record row
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

The tokens live in `src/routes/(app)/layout.css` under `@theme`, so components use `bg-paper`,
`text-ink` and friends instead of raw hex values. shadcn's semantic variables (`--background`,
`--primary`, `--border`, ...) are mapped onto the same palette, so generated controls sit inside the
same design.

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
