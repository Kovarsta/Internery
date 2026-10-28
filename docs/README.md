# Documentation

Durable contracts and decisions for Internery. These files are committed and are the reference for
implementation and review.

## Contracts

| File                                 | Purpose                                                  |
| ------------------------------------ | -------------------------------------------------------- |
| `contracts/openapi.yaml`             | API contract: OpenAPI 3.1, 65 operations under `/api/v1` |
| `contracts/implementation-status.md` | Which operations exist and which still return `501`      |

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
| `decisions/minio-staging.md`        | MinIO configuration for local and staging              |

## Still private

`.tmp/` and `.agent/` remain gitignored scratch areas. The database contract (`schema.ts`) and the
transaction recipes (`invariants.ts`) still live in `.tmp/` and move here in a later step. Private
review notes, including `.agent/schema-review.md`, stay out of the published docs.
