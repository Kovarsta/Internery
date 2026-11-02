# Documentation

Durable contracts and decisions for Internery. These files are committed and are the reference for
implementation and review.

## Contracts

| File                                 | Purpose                                                  |
| ------------------------------------ | -------------------------------------------------------- |
| `contracts/openapi.yaml`             | API contract: OpenAPI 3.1, 65 operations under `/api/v1` |
| `contracts/implementation-status.md` | Per-operation checklist of what exists and what is `501` |
| `contracts/invariants.ts`            | Transactional service rules and work-record signing      |

## Planning

| File         | Purpose                                               |
| ------------ | ----------------------------------------------------- |
| `roadmap.md` | Phase plan from the API foundation through deployment |

The API contract is **provisional**. Update it in the same change that alters a request or response
shape. When the implementation and the contract disagree, decide which one is right and record the
change; do not leave the mismatch undocumented.

## Decisions

| File                                | Decision                                               |
| ----------------------------------- | ------------------------------------------------------ |
| `decisions/avatar-storage.md`       | Application-served avatar URLs and private storage     |
| `decisions/better-auth-identity.md` | Better Auth owns the identity tables                   |
| `decisions/better-auth-surface.md`  | Auth endpoints live under `/api/auth`, not `/api/v1`   |
| `decisions/camel-case-columns.md`   | Product columns are camelCase, auth columns snake_case |
| `decisions/data-retention.md`       | Reference-aware file cleanup and retention             |
| `decisions/drizzle-style.md`        | Table objects, projections and service record types    |
| `decisions/minio-staging.md`        | MinIO configuration for local and staging              |

## Agent workspace

`.agents/` holds the installed skills, the schema review and scratch notes. It is committed and the
skills are pinned by `skills-lock.json`.

The original design schema has been retired. The product schema in
`src/lib/server/db/product.schema.ts` is what the application uses.
