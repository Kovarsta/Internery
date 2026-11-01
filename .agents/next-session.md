# Next session

## Current position

Phases 0 through 4 are done: 35 of 65 API operations are implemented, the contracts and roadmap are
published under `docs/`, and the frontend route skeletons exist. Next is Phase 5, storage: the
`StorageService`, the CV and avatar endpoints, and the retention sweep.

## Housekeeping

- `docs/contracts/implementation-status.md` is the per-operation checklist; keep it in sync with each
  handler.
- `.agents/decisions/` duplicates `docs/decisions/`. Two copies differ (`better-auth-surface.md`,
  `data-retention.md`); keep one source.
- `pnpm lint` still fails on scaffold files with CRLF line endings.
