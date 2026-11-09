# Demo fix roadmap

Date: 2026-11-08

Status: in progress. Structured job schedules, the day and time-of-day filters, the richer job
cards, early closing, the employer job workspace and account details are implemented. Student
preferences and suggestions are next; the remaining phases are still proposals.

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

| Area                | Today                                                                                                                           | Missing                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Suggestions         | `/` shows newest jobs; `/jobs` is unpersonalised                                                                                | no location or structured time preference in the profile |
| Filters             | keyword, category, location, day, time of day, verified, sort; API also supports `salaryMin`, `salaryMax`, `startFrom`, `endTo` | pay and date filters are not in the UI                   |
| Job cards           | dates, schedule, positions left, title, employer and rating, category, location, pay                                            | no time-of-day badges                                    |
| Sign out            | `POST /logout` from the header and footer                                                                                       | —                                                        |
| Close submissions   | `close` (`HIRING → CLOSED`), `cancel` (`CANCELLED`) and `complete` (`CLOSED                                                     | FILLED → COMPLETED`)                                     | —   |
| Name and phone      | editable on `/me` through `PATCH /me`                                                                                           | —                                                        |
| Email notifications | verification and every notification event sent through Resend                                                                   | no opt-out or retry; the demo needs a verified sender    |

## Decisions

All six decisions are settled and reflected in the code. The open items are the delivery polish
listed under phase 5, not the choices themselves.

| #   | Decision                    | Recommended                                                                                     | Alternative                                                  |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Job schedule model          | `daysOfWeek` plus `startTime`/`endTime`; the display string is derived                          | a stored slot enum beside free text                          |
| 2   | Student preferences         | `location` and a preference shape that mirrors a job (days plus a time range)                   | derive suggestions from free-text `availability`             |
| 3   | Suggestion behaviour        | home section + “Use my preferences” on `/jobs` (opt-in)                                         | automatically filter `/jobs` when the profile is complete    |
| 4   | Close submissions semantics | new `CLOSED` status; notify pending applicants with a new `JOB_CLOSED` type                     | `HIRING → FILLED`, or an `acceptingApplications` flag        |
| 5   | Email delivery              | Resend with a verified sender                                                                   | Mailpit in Compose with SMTP for a self-contained local demo |
| 6   | Email event coverage        | application received/decided, job closed/cancelled/completed, verification, review, work record | only application events, to keep the first pass small        |

## Phase 1 — Visible UX, no schema change

Goal: fix the obvious demo gaps without touching the database.

- **Sign out** (implemented): `POST /logout` calls `auth.api.signOut`, then redirects to `/`. The
  header and footer show a sign-out control for signed-in users.
- **Account details** (implemented): a form on the student and company profile tabs for name and
  phone, using the existing `PATCH /me`, with the API message inline. The `/me` overview stays a
  read-only summary. Email and password stay out of this pass; they need the verification and
  current-password rules that belong on a separate security page.
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

Implemented:

- new `CLOSED` job status and `JOB_CLOSED` notification type;
- `POST /jobs/{jobId}/close` (`HIRING → CLOSED`), owner-only and row-locked;
- pending applicants get a `JOB_CLOSED` in-app notification and email; accepted students are not
  affected;
- `acceptingApplications` is false for `CLOSED`, which also leaves the public search;
- a closed job can still be completed or cancelled;
- the employer job workspace at `/employer/jobs/[jobId]` keeps the “Close applications” action on
  the Overview tab, behind a confirmation dialog, instead of editing position counts.

Acceptance: an employer can close a hiring job; it leaves search; pending applicants see the
notification; a second close answers `409`. Verified against the demo build.

Effort: **S–M**.

## Phase 5 — Email

Implemented:

- one Resend sender in `email.ts` and one pure template in `email-template.ts`;
- every in-app notification also sends an email after the transaction commits;
- delivery failures are logged and never fail the request;
- the sender format in `.env` was fixed and `pnpm email:test` previews the real template.

Still open:

- in development, log the verification URL when sending fails, so signup is testable without a
  provider;
- optionally add a “resend verification” link;
- per-user opt-out, an outbox and retry when production needs guaranteed delivery.

Acceptance: a verification email arrives (or its link appears in the log); an application decision
sends an email; a provider failure does not break the action.

Effort: **M**.

## Phase 6 — Docs and demo data

- Update the contract, implementation-status checklist, `docs/frontend.md` and `AGENTS.md`.
- Extend the seed with student preferences and a closed job example. Locations are already seeded.
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
| `CLOSED` job status                      | new enum      | 4     |
| `JOB_CLOSED` notification type           | additive enum | 4     |
| email helper and templates               | no contract   | 5     |

## Out of scope

- AI suggestions or an AI ranking model; this roadmap is rule-based.
- More admin features.
- Per-user email preferences and unsubscribe links (revisit before production).
- Recurring shifts or per-day hours; the schedule is one time range over a set of days.

## Open questions

1. Should the home suggestions be opt-in, or automatic when the student profile is complete?
2. Do we add per-user email preferences before the demo, or after it?
3. Should a closed job appear in a separate employer filter, or only under “All”? It currently has
   its own `Closed` filter.
