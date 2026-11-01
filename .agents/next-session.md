# Next session

## Current position

Phases 0 through 3 are done: 30 of 64 API operations are implemented, the contracts and roadmap are
published under `docs/`, and the frontend route skeletons exist. Next is Phase 4, the transactional
core: accept, reject, cancel, complete, reviews, and the signed work record.

## Housekeeping

- `docs/contracts/implementation-status.md` is the per-operation checklist; keep it in sync with each
  handler.
- `.agents/decisions/` duplicates `docs/decisions/`. Two copies differ (`better-auth-surface.md`,
  `data-retention.md`); keep one source.
- The database contract (`schema.ts`) and its README are not published yet.
- `pnpm lint` still fails on scaffold files with CRLF line endings.
