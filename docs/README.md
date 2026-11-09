# Documentation

Durable contracts and decisions for Internery. These files are committed and are the reference for
implementation and review.

## Contracts

| File                                 | Purpose                                                  |
| ------------------------------------ | -------------------------------------------------------- |
| `contracts/openapi.yaml`             | API contract: OpenAPI 3.1, 69 operations under `/api/v1` |
| `contracts/implementation-status.md` | Per-operation checklist of what exists and what is `501` |
| `contracts/invariants.ts`            | Transactional service rules and work-record signing      |

## Data

| File       | Purpose                                               |
| ---------- | ----------------------------------------------------- |
| `erd.dbml` | Entity-relationship diagram of the 21 tables, in DBML |

`erd.dbml` mirrors `src/lib/server/db/auth.schema.ts` and `product.schema.ts`. Open it at
<https://dbdiagram.io> or with a DBML extension in the editor. Update it in the same change that adds
a table, column or foreign key.

## Guides

| File           | Purpose                                             |
| -------------- | --------------------------------------------------- |
| `api-guide.md` | How to call `/api/v1` from a client or script       |
| `frontend.md`  | How the SvelteKit app consumes the API and is built |

## Planning

| File                  | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `roadmap.md`          | Phase plan from the API foundation through deployment           |
| `demo-fix-roadmap.md` | Post-demo fixes: suggestions, filters, close, email, account UI |

The API contract is **provisional**. Update it in the same change that alters a request or response
shape. When the implementation and the contract disagree, decide which one is right and record the
change; do not leave the mismatch undocumented.

## Decisions

| File                                | Decision                                               |
| ----------------------------------- | ------------------------------------------------------ |
| `decisions/avatar-storage.md`       | Application-served avatar URLs and private storage     |
| `decisions/ai-features.md`          | DeepSeek provider and local CV text extraction         |
| `decisions/better-auth-identity.md` | Better Auth owns the identity tables                   |
| `decisions/better-auth-surface.md`  | Auth endpoints live under `/api/auth`, not `/api/v1`   |
| `decisions/camel-case-columns.md`   | Product columns are camelCase, auth columns snake_case |
| `decisions/data-retention.md`       | Reference-aware file cleanup and retention             |
| `decisions/drizzle-style.md`        | Table objects, projections and service record types    |
| `decisions/email-delivery.md`       | Resend sender, shared template and notification mail   |
| `decisions/locations.md`            | Canonical locations and server-side city search        |
| `decisions/minio-staging.md`        | MinIO configuration for local and staging              |
| `decisions/oauth-onboarding.md`     | GitHub OAuth role selection and the onboarding flag    |

## Agent workspace

`.agents/` holds the installed skills, the schema review and scratch notes. It is committed and the
skills are pinned by `skills-lock.json`.

The original design schema has been retired. The product schema in
`src/lib/server/db/product.schema.ts` is what the application uses.
