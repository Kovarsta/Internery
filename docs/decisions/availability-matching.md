# Student availability matching

Date: 2026-11-19

Status: implemented.

## The requirement

A student enters when they are free — days and time blocks — and gets the open jobs they can
actually work. The example given was “I work weekends and I am free in this slot”.

## Why this is a query, not an AI feature

The job schedule is structured data already:

```ts
daysOfWeek: dayOfWeek().array().notNull(),
startTime: time().notNull(),
endTime: time().notNull(),
```

“Free Saturday morning” is an interval comparison. A model cannot guarantee that it returns every
feasible job and no infeasible one, and a list of jobs that fit is a correctness claim. So the
matching runs in SQL, where it is exact, fast, free and testable. Ranking is a different question;
if a ranked order is ever needed, that is where a model belongs, over a shortlist the query already
proved feasible.

## Where the preferences live

`student_profiles` stores them next to the free-text note:

| Column               | Type            | Meaning                    |
| -------------------- | --------------- | -------------------------- |
| `availableDays`      | `day_of_week[]` | Days the student can work  |
| `availableTimeOfDay` | `time_of_day[]` | Blocks they are free in    |
| `availability`       | `text`          | Free-text notes, unchanged |

Empty arrays mean “no preference stated” and must not filter anything. The migration is
`0009_worried_maelstrom.sql`.

The profile form collects them as checkboxes, so the values are always from the known sets; the API
validates the arrays with the same enums the jobs use.

## Overlap versus containment

This is the part that makes the feature different from the existing day and time filters.

| Mode                         | Predicate                | Question it answers                    |
| ---------------------------- | ------------------------ | -------------------------------------- |
| Browse filters (default)     | `daysOfWeek && selected` | “Does this job run on a day I picked?” |
| Availability (`scheduleFit`) | `daysOfWeek <@ selected` | “Can I work **all** of this job?”      |

For time blocks the same split applies:

| Mode          | Predicate                             |
| ------------- | ------------------------------------- |
| Default       | shift overlaps the block              |
| `scheduleFit` | `startTime >= from AND endTime <= to` |

Why it matters, with the seeded data:

```text
Linh: Saturday + Sunday, Morning + Afternoon

Overlap      14 jobs, including:
  Delivery rider assistant   Mon-Sat 10:00-14:00   (needs weekdays)
  Event security assistant   Sat     16:00-22:00   (outside the blocks)

Containment   3 jobs:
  Exam invigilator           Sat     08:00-12:00
  Hotel breakfast server     Weekends 06:00-11:00
  Bakery shop helper         Weekends 06:00-12:00
```

Only the containment list is actually workable. Returning the first list under the label “fits your
week” would be wrong.

## How the student reaches it

1. `/me/profile` opens with a dedicated **When are you free?** card: seven day checkboxes, three
   block checkboxes, a free-text note and the weekly email toggle. It saves through its own action,
   so saving the rest of the profile cannot clear it.
2. `/recommendations` has two tabs. **Fits my week** lists the matching jobs; **For you** holds the
   AI ordering. Both fetch in the browser and show a skeleton while they load.
3. The page is reached from the header **Recommendations** link, the `/me` overview and the profile
   card. `/for-you` and `/fits-my-week` redirect to the matching tab.

The page calls `GET /jobs` with `scheduleFit=true`. The same parameter still works on `/jobs`, where
a banner explains why the list is filtered; that keeps shared links honest.

## Weekly email

`pnpm availability:digest` emails each eligible student the new jobs that fit since their last
message. It is a script, not a scheduler, so it can run from cron once a day:

- only active students with saved availability and the email turned on are considered;
- a student is skipped until `DIGEST_INTERVAL_DAYS` (7) have passed since `digestLastSentAt`;
- the job query is the same containment test as the page, limited to jobs posted since that time;
- no matches means no email and no timestamp update, so the next run still covers them;
- `--dry-run` prints who would be emailed and which jobs, without sending.

The email is on by default because it is what makes saving availability useful; the card on
`/me/profile` turns it off. `digestEnabled` is optional in `PUT /me/student-profile`, so a payload
that omits it leaves the stored value alone.

## API change

`GET /jobs` gained one optional query parameter:

```yaml
scheduleFit: boolean
```

With `dayOfWeek` or `timeOfDay`, it switches the comparison from overlap to containment. Without it,
the existing behaviour is unchanged, so every current caller and test keeps its meaning.

## Non-goals

- Per-day time blocks (`Saturday morning only`). The model is “a set of days plus a set of blocks”,
  which covers the requirement without a new table.
- Ranges beyond the three blocks. `TIME_OF_DAY_RANGES` is the single source of truth for the blocks.
- Ranking by pay, distance or employer rating. That is a separate, optional layer.
