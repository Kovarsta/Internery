# OAuth onboarding and role selection

Date: 2026-11-09

## Context

Email registration asks for a role before it creates the account. GitHub OAuth skips that form, and
Better Auth's `users.role` defaults to `STUDENT`, so a new OAuth account would otherwise guess
whether the person is a student or an employer.

## Decision

- `user_profiles.onboardedAt` is nullable. Migration `0008` backfills every existing row so current
  accounts are not sent through onboarding.
- Email registration sets the role and `onboardedAt` in one transaction.
- A new OAuth account leaves `onboardedAt` null. The root `(app)` layout redirects a signed-in
  account with a null value to `/onboarding`, except when the request is already for that page.
- GitHub sign-in uses `newUserCallbackURL: ${ORIGIN}/onboarding` for the first redirect. The flag is
  the durable guard, so closing the onboarding tab does not leave the account half-created.
- `/onboarding` offers Student or Employer, writes the role and timestamp, then sends the person to
  the matching profile editor.
- Better Auth's default implicit account linking stays on. A GitHub email that matches an existing
  verified account links to that account instead of creating a duplicate.

## Consequences

- Every signed-in page does one primary-key lookup for the flag.
- The guard is a page guard. A brand-new OAuth account still has the default `STUDENT` role at the
  API layer until onboarding completes. For v1 that is acceptable; add an API-level check if direct
  API access before onboarding becomes a concern.
- Role changes after onboarding are not supported in the UI. An admin has to correct a wrong choice.
- The GitHub OAuth app callback URL must be `${ORIGIN}/api/auth/callback/github`.
