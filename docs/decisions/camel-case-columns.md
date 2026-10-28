# camelCase product columns

Date: 2026-10-21

## Context

The contract in `.tmp/schema.ts` declares columns without explicit names and relies on
`casing: 'snake_case'` in both drizzle-kit and the runtime client. The generated Better Auth schema
already declares explicit snake_case column names.

## Decision

The product schema uses Drizzle's default camelCase column names. Do not add `casing` to
`drizzle.config.ts` or `src/lib/server/db/index.ts`, and do not give product columns explicit
snake_case names.

The database therefore has two naming styles:

- Better Auth tables: snake_case (`email_verified`, `user_id`, `created_at`, ...).
- Product tables: camelCase (`employerId`, `isHidden`, `createdAt`, ...).

## Consequences

- The product schema no longer matches `.tmp/0000_init.sql`, which was generated with snake_case.
  The contract SQL remains useful for constraints, indexes and intent, not for column names.
- Raw SQL for product tables must quote camelCase identifiers, for example
  `SELECT "employerId" FROM jobs`.
- Query builders handle quoting automatically; only hand-written SQL is affected.
- The baseline migration `drizzle/0000_pink_thundra.sql` contains both styles.
- If the project ever changes to snake_case, regenerate a migration rather than editing the
  baseline by hand.
