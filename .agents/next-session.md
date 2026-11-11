# Next session

## Current position

Version one is feature-complete for the demo:

- 64 of 69 API operations are implemented. The AI consent/read operations and the shareable
  work-record card still return `501`.
- Phases 0-6 and 8 are done. Phase 7 (optional AI) and phase 9 (hardening/deployment) remain.
- The frontend includes the pitched home page, job browsing, applications, saved jobs, employer
  job workspace, reviews, work records, admin area, GitHub OAuth onboarding and password reset.
- The admin area has pagination for users, moderation and verification, title search for moderation,
  category search, and account filters limited to states the app can actually produce.
- `user_profiles.onboardedAt` is the durable OAuth onboarding flag; migration `0008` backfilled it.

## Next

- Finish the remaining UI nitpicks.
- Add student preferences and the “Fits your week” / “Use my preferences” suggestions.
- Build the shared `/me/security` page for email and password changes, including current-password
  confirmation for admins.
- Extend the seed with student preferences and a closed job example.
- Implement file retention and garbage collection (`docs/decisions/data-retention.md`).
- Phase 9: end-to-end journeys, real-Postgres concurrency tests and deployment hardening.

## Housekeeping

- `docs/contracts/implementation-status.md` is the per-operation checklist; keep it in sync with each
  handler.
- `docs/contracts/openapi.yaml` is the contract. Update it in the same change that alters a request
  or response shape.
- `.agents/decisions/` holds older copies; `docs/decisions/` is authoritative.
- `pnpm lint` still fails on unrelated scaffold files with CRLF line endings; check changed files
  directly.
