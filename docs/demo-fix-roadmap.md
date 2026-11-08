# Demo fix roadmap

Date: 2026-11-08

Status: proposed. Nothing here is implemented yet.

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

| Area                | Today                                                                                                         | Missing                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Suggestions         | `/` shows newest jobs; `/jobs` is unpersonalised                                                              | no location or structured time preference in the profile    |
| Filters             | keyword, category, location, verified, sort; API also supports `salaryMin`, `salaryMax`, `startFrom`, `endTo` | pay and date filters are not in the UI; no time-slot filter |
| Job cards           | dates, positions left, title, employer, category, location, pay                                               | no `schedule` (only on the detail page); no employer rating |
| Sign out            | —                                                                                                             | no control in the header                                    |
| Close submissions   | `cancel` (`CANCELLED`) and `complete` (`FILLED → COMPLETED`)                                                  | no way to stop accepting applications early                 |
| Name and phone      | `PATCH /me` supports `fullName` and `phone`                                                                   | `/me` is read-only                                          |
| Email notifications | verification email via Resend; event notifications are in-app only                                            | event emails do not exist; verification depends on Resend   |

## Decisions to confirm

| #   | Decision                    | Recommended                                                                                     | Alternative                                                  |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Time-slot data model        | array of `MORNING`, `AFTERNOON`, `EVENING`, `WEEKEND`                                           | one primary slot per job                                     |
| 2   | Student preferences         | add `location` and `preferredTimeSlots` to `student_profiles`                                   | derive suggestions from free-text `availability`             |
| 3   | Suggestion behaviour        | home section + “Use my preferences” on `/jobs` (opt-in)                                         | automatically filter `/jobs` when the profile is complete    |
| 4   | Close submissions semantics | `HIRING → FILLED`; notify pending applicants with a new `JOB_CLOSED` type                       | new `CLOSED` status, or an `acceptingApplications` flag      |
| 5   | Email delivery              | Resend with a verified sender                                                                   | Mailpit in Compose with SMTP for a self-contained local demo |
| 6   | Email event coverage        | application received/decided, job closed/cancelled/completed, verification, review, work record | only application events, to keep the first pass small        |

## Phase 1 — Visible UX, no schema change

Goal: fix the obvious demo gaps without touching the database.

- **Sign out**: `POST /logout` action calls `auth.api.signOut`, then redirects to `/`. The header
  shows the name and a sign-out button for signed-in users.
- **Account details**: a form on `/me` for name and phone, using the existing `PATCH /me`. Show the
  API message inline. Leave email out of the first pass.
- **Job cards**: add the schedule line and the employer rating/review count. `JobSummary` gains
  `schedule` (additive contract change).
- **Filters**: add minimum pay and a start-date field. The API already supports both.
- **Filter UX**: removable chips for active filters, “Clear all”, and the result count.

Acceptance: a student can sign out, rename themselves, change their phone, see the schedule on a
card, and filter by minimum pay and start date. `pnpm check`, tests and build pass.

Effort: **S**.

## Phase 2 — Time slots and location

Goal: give the suggestions and the time-slot filter something reliable to match.

Database (one migration):

- enum `time_slot` with `MORNING`, `AFTERNOON`, `EVENING`, `WEEKEND`;
- `jobs.timeSlots time_slot[] not null`, default `{}` (a shift can be weekend + morning);
- `student_profiles.location varchar(160)`;
- `student_profiles.preferredTimeSlots time_slot[] not null`, default `{}`;
- seed a mix of slots and locations for the demo jobs and the three students.

Contract (additive):

- `JobFields.timeSlots` (required on create, optional on update);
- `JobSummary.timeSlots`, plus `schedule` from phase 1;
- `StudentProfile` and `StudentProfileInput` gain `location` and `preferredTimeSlots`;
- `GET /jobs` gains `timeSlot` (repeatable query parameter).

UI:

- job create/edit form: time-slot checkboxes next to the schedule text;
- student profile: a location field and time-slot checkboxes;
- job filters: time-slot checkboxes;
- job cards: slot badges.

Acceptance: a job can be posted as weekend + morning; filtering by weekend returns it; the student
can save their location and slots.

Effort: **M**.

## Phase 3 — Suggestions

Rule-based only; this is not AI.

- On `/` for a signed-in student with a location or slots: a **“Fits your week”** section with up to
  four open jobs. Match `location` case-insensitively (and treat `Online` as a match) and require at
  least one shared time slot. Sort by newest first.
- On `/jobs`: **“Use my preferences”** fills the location and slot filters from the profile. It does
  not hijack a manual search.
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
- Extend the seed with locations, time slots, and a closed job example.
- Add a short demo script: sign in as a student, show suggestions, filter by slot, close a job as
  the employer, sign out.

Effort: **S**.

## Contract impact summary

| Change                                   | Type          | Phase |
| ---------------------------------------- | ------------- | ----- |
| `JobSummary.schedule`                    | additive      | 1     |
| filters `salaryMin` / `startFrom` in UI  | no contract   | 1     |
| `JobFields.timeSlots`                    | additive      | 2     |
| `GET /jobs?timeSlot=`                    | additive      | 2     |
| student `location`, `preferredTimeSlots` | additive      | 2     |
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
