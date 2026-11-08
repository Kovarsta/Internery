# Demo fix roadmap

Date: 2026-11-08

Status: in progress. Structured job schedules, the day and time-of-day filters, and the richer job
cards are implemented. Student preferences and suggestions are next; the remaining phases are still
proposals.

Feedback from the professor demo, grouped so the visible UX fixes land first and the schema and
contract changes stay together. This comes before the remaining AI endpoints and before more admin
work.

## Goal

Make the demo feel like a working student job marketplace:

- a signed-in student gets suggestions that use their location and free time;
- filters and job cards show the information a student actually decides with;
- account controls exist;
- an employer can stop accepting applications without cancelling the job;
- email works, or at least fails visibly.

## What already exists

| Area                | Today                                                                                                                           | Missing                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Suggestions         | `/` shows newest jobs; `/jobs` is unpersonalised                                                                                | no location or structured time preference in the profile  |
| Filters             | keyword, category, location, day, time of day, verified, sort; API also supports `salaryMin`, `salaryMax`, `startFrom`, `endTo` | pay and date filters are not in the UI                    |
| Job cards           | dates, schedule, positions left, title, employer and rating, category, location, pay                                            | no time-of-day badges                                     |
| Sign out            | `POST /logout` from the header and footer                                                                                       | —                                                         |
| Close submissions   | `cancel` (`CANCELLED`) and `complete` (`FILLED → COMPLETED`)                                                                    | no way to stop accepting applications early               |
| Name and phone      | `PATCH /me` supports `fullName` and `phone`                                                                                     | `/me` is read-only                                        |
| Email notifications | verification email via Resend; event notifications are in-app only                                                              | event emails do not exist; verification depends on Resend |

## Decisions

Decisions 1-3 are settled and reflected in the code. Decisions 4-6 still need an answer before
their phases.

| #   | Decision                    | Recommended                                                                                     | Alternative                                                  |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Job schedule model          | `daysOfWeek` plus `startTime`/`endTime`; the display string is derived                          | a stored slot enum beside free text                          |
| 2   | Student preferences         | `location` and a preference shape that mirrors a job (days plus a time range)                   | derive suggestions from free-text `availability`             |
| 3   | Suggestion behaviour        | home section + “Use my preferences” on `/jobs` (opt-in)                                         | automatically filter `/jobs` when the profile is complete    |
| 4   | Close submissions semantics | `HIRING → FILLED`; notify pending applicants with a new `JOB_CLOSED` type                       | new `CLOSED` status, or an `acceptingApplications` flag      |
| 5   | Email delivery              | Resend with a verified sender                                                                   | Mailpit in Compose with SMTP for a self-contained local demo |
| 6   | Email event coverage        | application received/decided, job closed/cancelled/completed, verification, review, work record | only application events, to keep the first pass small        |

## Phase 1 — Visible UX, no schema change

Goal: fix the obvious demo gaps without touching the database.

- **Sign out** (implemented): `POST /logout` calls `auth.api.signOut`, then redirects to `/`. The
  header and footer show a sign-out control for signed-in users.
- **Account details**: a form on `/me` for name and phone, using the existing `PATCH /me`. Show the
  API message inline. Leave email out of the first pass.
- **Job cards**: add the schedule line and the employer rating/review count. `JobSummary` gains
  `schedule` (additive contract change).
- **Filters**: add minimum pay and a start-date field. The API already supports both.
- **Filter UX**: removable chips for active filters, “Clear all”, and the result count.

Acceptance: a student can sign out, rename themselves, change their phone, see the schedule on a
card, and filter by minimum pay and start date. `pnpm check`, tests and build pass.

Effort: **S**.

## Phase 2 — Structured schedules, filters and card details

Goal: give the suggestions and the filters something reliable to match.

Implemented:

- enum `day_of_week` and `jobs.daysOfWeek day_of_week[]`, `startTime time`, `endTime time`,
  `scheduleNote text`;
- the display `schedule` is derived from those values, never stored beside them;
- the employer form takes day checkboxes and a start and end time;
- `GET /jobs` accepts comma-separated `dayOfWeek` and `timeOfDay`; values are OR-ed inside each
  list and the two lists combine with AND;
- `/jobs` has Day and Time of day controls, Weekdays/Weekend shortcuts and removable chips in a
  sticky sidebar; on small screens the chips follow the scroll as a sticky bar with an Edit link;
- job cards show the schedule and the employer rating.

Still open:

- `student_profiles.location` and a preference shape that mirrors a job (days plus a time range);
- seeded preferences for the demo students.

Contract:

- `JobFields` and `JobSummary` use `daysOfWeek`, `startTime`, `endTime` and `scheduleNote`;
- `StudentProfile` and `StudentProfileInput` will gain `location` and the preference fields.

Acceptance: a job can be posted as weekdays 06:00-10:00; filtering by Monday and Morning returns it;
the student can save their location and preferred days and times.

Effort: **M**.

## Phase 3 — Suggestions

Rule-based only; this is not AI.

- On `/` for a signed-in student with a location or preferences: a **“Fits your week”** section with
  up to four open jobs. Match `location` case-insensitively (and treat `Online` as a match) and
  require a shared day plus an overlapping time block. Sort by newest first.
- On `/jobs`: **“Use my preferences”** fills the location, day and time-of-day filters from the
  profile. It does not hijack a manual search.
- Incomplete profile: a short prompt linking to `/me/profile` instead of an empty section.
- Reuse `GET /jobs`; no new endpoint, so the rule stays visible and testable.

Acceptance: with a complete student profile, the home section shows matching jobs; clearing the
profile shows the prompt; the button prefills the filters.

Effort: **M**.

## Phase 4 — Close submissions early

- New operation `POST /jobs/{jobId}/close` (`HIRING → FILLED`), owner-only and row-locked.
- Pending applicants get a `JOB_CLOSED` in-app notification; the notification type is added to the
  enum in the phase 2 migration.
- `acceptingApplications` already becomes false for `FILLED`, and `complete` still works after the
  work is done.
- Employer jobs list: a “Close applications” button with confirmation.

Acceptance: an employer can close a hiring job; it leaves search; pending applicants see the
notification; a second close answers `409`.

Effort: **S–M**.

## Phase 5 — Email

Two separate problems.

**Verification mail**

- Confirm the Resend key and verified sender in `.env`; `@internery.local` seed accounts cannot
  receive mail.
- In development, log the verification URL when sending fails, so signup is testable without a
  provider.
- Optionally add a “resend verification” link.

**Event mail**

- One `sendNotificationEmail` helper with plain text and HTML, called **after** the database
  transaction commits, never inside it. A failed send is logged and never fails the request.
- Cover the events agreed in decision 6.
- If decision 5 is Mailpit, add it to Compose and send through SMTP instead of Resend, so the demo
  works with any address.

Acceptance: a verification email arrives (or its link appears in the log); an application decision
sends an email; a provider failure does not break the action.

Effort: **M**.

## Phase 6 — Docs and demo data

- Update the contract, implementation-status checklist, `docs/frontend.md` and `AGENTS.md`.
- Extend the seed with locations, student preferences, and a closed job example.
- Add a short demo script: sign in as a student, show suggestions, filter by day and time of day,
  close a job as the employer, sign out.

Effort: **S**.

## Contract impact summary

| Change                                   | Type          | Phase |
| ---------------------------------------- | ------------- | ----- |
| `JobSummary.schedule`                    | additive      | 1     |
| filters `salaryMin` / `startFrom` in UI  | no contract   | 1     |
| `JobFields.daysOfWeek` / times / note    | additive      | 2     |
| `GET /jobs?dayOfWeek=&timeOfDay=`        | additive      | 2     |
| student `location` and preference fields | additive      | 2     |
| `POST /jobs/{jobId}/close`               | new operation | 4     |
| `JOB_CLOSED` notification type           | additive enum | 2/4   |
| email helper and templates               | no contract   | 5     |

## Out of scope

- AI suggestions or an AI ranking model; this roadmap is rule-based.
- More admin features.
- Per-user email preferences and unsubscribe links (revisit before production).
- Structured scheduling (recurring shifts, per-day hours); `schedule` stays free text.

## Open questions

1. Time slots: array as proposed, or one primary slot?
2. Suggestions: opt-in button plus home section, or automatic filtering?
3. Close submissions: reuse `FILLED`, or introduce `CLOSED` / an `acceptingApplications` flag?
4. Email: Resend, or Mailpit in Compose for the demo?
5. Should phase 1 ship alone first, so the professor sees improvements before the migration?
