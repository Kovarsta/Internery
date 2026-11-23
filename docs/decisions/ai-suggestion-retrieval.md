# Suggestion retrieval

Date: 2026-11-19

Status: current implementation accepted for the capstone. The improvements below are recorded as
future work, not scheduled tasks.

## Context

`GET /me/ai/suggestions` is a **re-ranker**, not a recommender. SQL chooses a shortlist, and the
model only orders it. The quality of the answer is therefore capped by the quality of the
shortlist, not by the model.

This is a deliberate capstone choice. The demo marketplace is small (34 seeded jobs), and the
project is not going to production. The current retrieval is simple, readable and testable, which
matters more here than production-grade relevance.

The implementation lives in `src/lib/server/services/ai/suggestions.ts`. The route is
`GET /me/ai/suggestions`; the student page is the **For you** tab on `/recommendations`, a top-level
page rather than an account tab.

## Current funnel

```text
all jobs
  │  status = 'HIRING' AND isHidden = false
  ▼
open, visible jobs
  │  title OR description OR category contains any of up to 6 profile terms
  ▼
at most 20 matches, newest first
  │  if fewer than 5 matched, top up with recent open jobs
  ▼
at most 20 candidates ──▶ model ranks ids
  │  keep only ids from the candidate list
  │  deduplicate, take at most 5
  │  re-check still HIRING and visible
  ▼
at most 5 suggestions
```

The numbers:

| Constant          | Value | Meaning                                           |
| ----------------- | ----- | ------------------------------------------------- |
| `MAX_MATCH_TERMS` | 6     | Major plus at most five skills feed the SQL match |
| `MAX_CANDIDATES`  | 20    | Most jobs sent to the model                       |
| `MAX_SUGGESTIONS` | 5     | Most jobs returned; also the top-up threshold     |

### Profile terms

```ts
const terms = uniqueTerms([major, ...skills]).slice(0, MAX_MATCH_TERMS);
```

The profile order is preserved, so only the first five skills influence retrieval. Later skills still
reach the model in the `student.skills` part of the prompt, but they do not widen the SQL shortlist.

### SQL match

```ts
const matches = terms.map((term) =>
	or(
		containsText(jobs.title, term),
		containsText(jobs.description, term),
		containsText(categories.name, term)
	)
);
```

`containsText` is a literal, case-insensitive substring match:

```sql
column ILIKE '%term%' ESCAPE '\'
```

Any one term in any one column is enough. The result is ordered by `createdAt DESC`, then limited
to 20.

### Top-up

When fewer than five jobs match, `topUpCandidates` appends recent open jobs that were not already
selected, up to 20. The intent is that a rare major does not produce an empty page. The trade-off is
that topped-up jobs may be unrelated to the profile.

### Authorization

For suggestions, “authorized” means **visible to students**:

```ts
status = 'HIRING' AND isHidden = false
```

The same condition is applied twice:

1. when candidates are selected,
2. when the model's chosen ids are turned back into rows.

The model cannot add a job, cannot see a hidden job, and cannot see employer-only fields.
`toAiJobContext` sends only public job data: title, description, category, location, schedule and
salary.

Suggestions never read the CV and do not require AI consent. Fit is the private path: it checks
consent and ownership before reading the CV.

## Why 20 is enough for the capstone

- The seed has 34 jobs, so 20 candidates covers most of the marketplace.
- The model's job is ordering a shortlist, not discovering inventory.
- The fallback path (local ranking) produces a usable answer without the model.
- The 15-second timeout and the 10-call daily budget are easier to keep with a small prompt.
- A larger or smarter retrieval stage would add code, schema and tests for a benefit the demo does
  not need.

## Known limits

These are accepted for the capstone and recorded so a future reader does not mistake them for bugs.

### Recency, not relevance

```ts
.orderBy(desc(jobs.createdAt), desc(jobs.id))
.limit(20)
```

If 60 open jobs match a term, the list is the **20 newest**, not the **20 best**. A highly relevant
older job can be excluded before the model sees it. The local ranking only reorders the 20 that were
already selected.

### Literal substring matching

- `"customer service"` does not match `"serving customers"`.
- `"phục vụ"` does not match `"phuc vu"`: no diacritic folding.
- `"barista"` does not match `"pha chế"`: no synonym mapping.
- `"art"` matches `"barista"` and `"part-time"`: no word boundaries.

### Missing signals

- The student profile has no location, so job location cannot be personalized.
- `availability` is free text. It reaches the model, which can reason about “weekday evenings”
  against `daysOfWeek` and the shift times, but SQL does not filter on it.
- `toAiJobContext` drops employer verification and rating, so the model cannot prefer a verified
  employer.
- There is no diversity rule. Twenty similar jobs from one employer can fill the shortlist.
- Topped-up jobs are not marked as non-matches in the prompt.

## How to pick a better set

If this is ever revisited, these are the changes in rough order of value.

### 1. Retrieve wider, ordered by a score

Keep the SQL stage, but make it score instead of filter-and-sort by recency.

```text
category match        weight 3
title match           weight 2
description match     weight 1
verified employer     +1
createdAt             tie-breaker
```

```sql
ORDER BY score DESC, created_at DESC
LIMIT 50
```

Then apply the local ranking and a diversity cap to cut 50 down to 20. This fixes the
“relevant but older” problem without changing the model contract.

### 2. Normalize the text

`src/lib/search.ts` already provides `normalizeSearchText`: lowercases, strips Vietnamese
diacritics (including `đ`), removes punctuation and collapses whitespace.

Apply it to both the profile terms and the job text, so:

- `phục vụ` matches `phuc vu`,
- `Hồ Chí Minh` matches `ho chi minh`,
- casing and punctuation stop affecting the match.

The current `jobs_fts_idx` uses `to_tsvector('simple', ...)`, which does not fold diacritics. A
normalized expression or a generated normalized column would be a schema change.

### 3. Add synonyms and a category mapping

A small map would cover most of the marketplace vocabulary:

```text
barista    -> pha che, coffee, cafe
cashier    -> thu ngan, counter
waitress   -> phuc vu, server
warehouse  -> kho, dong hang
```

A mapping from majors and skills to **categories** is even stronger, because `categories.name`
already exists. A category match can then outweigh a description match.

### 4. Send the match reason to the model

Instead of a flat job object, include why the job was retrieved:

```json
{
	"id": "...",
	"title": "Part-time barista",
	"matchedOn": ["category", "title"],
	"employerVerified": true
}
```

The model can then weigh a category match differently from a description match, instead of guessing
why the job is in the list.

### 5. Add diversity

Cap the shortlist at, for example, two or three jobs per employer and per category. Otherwise one
employer with ten similar postings can fill the 20 and leave the model nothing meaningful to rank.

### 6. Mark topped-up jobs

Topped-up jobs are not profile matches. Either mark them in the prompt as “recent other jobs”, or
append them after the real matches and tell the model they are not matches.

## What to change first, if ever

1. Order the SQL pre-filter by relevance, not recency.
2. Normalize terms and job text with `normalizeSearchText`.
3. Retrieve 50, then cut to 20 after local ranking and a per-employer cap.

That keeps the current architecture — SQL retrieval, model re-ranking — and improves the only part
that limits answer quality.

## Non-goals

- Vector embeddings or a dedicated search service for the capstone.
- Letting the model query the database through tools. Retrieval stays server-side, so visibility and
  authorization are enforced in SQL.
- Personalization from click or application history. No analytics table exists yet, and the demo
  does not need one.
