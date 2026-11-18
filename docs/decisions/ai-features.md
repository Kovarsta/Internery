# AI features

Date: 2026-11-03. Service layer implemented 2026-11-18; API handlers still return `501`.

## Scope

Four operations:

- `GET /me/ai/consent`, `PUT /me/ai/consent`
- `GET /me/ai/suggestions`
- `GET /jobs/{jobId}/ai/fit`

The rules live in `contracts/openapi.yaml` (AI section); this file records the implementation
choices. The consent, suggestions and fit routes are implemented, with pages at `/me/ai` for
consent, `/for-you` for suggestions and a **Why this fits** panel on the job detail page.

## Provider

DeepSeek, through its OpenAI-compatible API.

- Base URL `https://api.deepseek.com`
- Model `deepseek-flash` by default; `DEEPSEEK_MODEL` can select another model.
- `response_format: { type: 'json_object' }`, and the prompt must also ask for JSON. DeepSeek's JSON
  mode requires both.
- `thinking: { type: 'disabled' }`: this is classification, not reasoning, and a reasoning pass
  would eat the 15-second budget.
- Requests use plain `fetch`; there is no OpenAI SDK dependency.
- Env: `DEEPSEEK_API_KEY` (empty disables the AI calls) and `DEEPSEEK_MODEL`.

The provider sits behind the `AiProvider` interface in `src/lib/server/ai/provider.ts`. Tests use
`createFakeProvider`, so the suite never calls DeepSeek.

## CV text extraction

PDF and DOCX need different tools.

- **PDF**: `@firecrawl/pdf-inspector` — the local napi-rs library, MIT, no API key. It is not the
  hosted Firecrawl API.
  - `classifyPdfAsync` first: `Scanned` or `ImageBased` means there is no text to extract, so answer
    `422 CV_UNREADABLE` instead of calling the model.
  - `extractPagesMarkdownAsync` for the text.
  - Prebuilt binaries cover Windows x64, Linux x64/ARM64 and macOS ARM64.
- **DOCX**: `mammoth.extractRawText({ buffer })`.
- Text is normalised (line endings, trailing spaces, blank runs) before it is hashed or sent.
- Extraction fixtures are committed under `src/lib/server/ai/fixtures/`: one text PDF and one DOCX.

Considered and rejected:

- The hosted Firecrawl API: the CV would leave the server before redaction, adding a second vendor
  to the consent statement.
- `unpdf`: pure JS and simpler to deploy, but no scan classification and weaker reading order. It
  stays the fallback if the native package causes deployment trouble.

## Privacy and correctness

- Extract on our server, then remove the student's name, phone and email before sending anything.
- Redaction removes the full name (case- and spacing-insensitive), every email address, and
  Vietnamese phone numbers in the common formats. It is a filter, not anonymisation: a nickname or
  a name part used alone can remain, so the consent notice never promises anonymity.
- `cvHash` is SHA-256 of the redacted, normalised text, not of the raw file. Re-uploading the same
  CV hits the cache; any edit misses it.
- The text sent to the provider is capped at 20,000 characters after redaction, so truncation cannot
  leave half a name behind.
- Every `cvQuote` must appear in the redacted text. Whitespace and markdown markers are normalised
  on both sides; reasons that fail are dropped (AC-37.2).
- Results are cached per (student, job, cvHash). Cache hits do not count toward the daily limit.
- No OCR in this phase: a scanned CV is `CV_UNREADABLE`.

## Consent

- A row exists once the student grants consent; `withdrawnAt IS NULL` means it is active.
- Granting twice is idempotent and keeps the original `consentedAt`.
- Withdrawing when consent was never granted does not create a row: `consentedAt` is non-null, and a
  row would claim a grant that never happened.
- The student page is `/me/ai`: it shows `dataSent`, the current state and the dates, and confirms
  withdrawal because that deletes the cached explanations.
- The notice names the redaction and the purpose, not the vendor, so a provider swap does not require
  a new consent.
- Withdrawal deletes every `ai_explanations` row for the student in the same transaction
  (AC-38.3).
- Fit checks consent before reading the CV. Suggestions never read the CV and do not require
  consent.

## Daily limit

- 10 provider calls per user per day (NFR-25), counted in `ai_usage`.
- The day is the Vietnam calendar day, so the limit resets at local midnight.
- A call is reserved before the provider is contacted and released again if the provider fails or
  times out, so a failure never costs a student an attempt.
- Fit returns `429 AI_RATE_LIMITED` when the budget is spent.
- Suggestions absorb the limit into `source: FALLBACK` (AC-36.3).

## Fit

- The student page is the job detail page. The **Why this fits** panel runs the
  request on demand, not during the page load: a call can take up to 15 seconds
  and spends one of the ten daily calls.
- The panel appears only for students on a `HIRING` job.
- A missing job is `404`, a missing or unreadable CV is `422 CV_UNREADABLE`.
- A provider failure has no honest fallback: the reserved call is released, the error is logged and
  the request fails as a server error. The client can retry without spending quota.
- The cache stores the verified reasons and up to three gaps. Two requests for the same CV and job
  can race; `onConflictDoNothing` means the first stored answer wins.

## Suggestions

- The student's major is required; without it the answer is `422 PROFILE_INCOMPLETE` and the
  provider is not called (AC-36.2).
- The SQL pre-filter matches the major and up to five skills against job title, description and
  category, and returns at most 20 candidates. If fewer than five match, recent open jobs top the
  list up, so a rare major does not produce an empty page.
- The provider only ranks ids. The service drops ids outside the candidate list, de-duplicates them,
  and re-checks that the chosen jobs are still `HIRING` and visible (AC-36.4).
- The local ranking (profile-term count, then newest) is the fallback answer and the safety net when
  the model returns nothing usable.
- Suggestion items carry `verdict: null`: ranking does not judge fit.

The candidate shortlist and its known limits are recorded separately in
[`ai-suggestion-retrieval.md`](ai-suggestion-retrieval.md). The current retrieval is accepted for the
capstone; the improvement list there is future work, not a defect.

## Prompt and JSON shapes

Prompts live in `src/lib/server/ai/prompts.ts` so they can be reviewed as copy.

- Fit returns `{"verdict":"FIT"|"MAYBE_FIT","reasons":[{"text","cvQuote"}],"gaps":[...]}`.
- Suggestions return `{"rankedJobIds":[...]}`.
- Both system prompts say the CV, profile and advert are data, not instructions.
- The provider validates the JSON with Zod and treats anything else as `invalid-response`.

## Code map

| File                                         | Role                                         |
| -------------------------------------------- | -------------------------------------------- |
| `src/lib/server/ai/provider.ts`              | The interface, shared types and timeout      |
| `src/lib/server/ai/deepseek.ts`              | The DeepSeek client and JSON validation      |
| `src/lib/server/ai/fake.ts`                  | Deterministic provider for tests and dev     |
| `src/lib/server/ai/prompts.ts`               | Prompt copy and the JSON instructions        |
| `src/lib/server/ai/cv-text.ts`               | Extraction, normalisation, hash, quote check |
| `src/lib/server/ai/redaction.ts`             | Name, phone and email removal                |
| `src/lib/server/ai/index.ts`                 | The configured provider                      |
| `src/lib/server/services/ai/consent.ts`      | Consent state and withdrawal                 |
| `src/lib/server/services/ai/usage.ts`        | Daily reservation and release                |
| `src/lib/server/services/ai/fit.ts`          | Fit flow, cache and quote verification       |
| `src/lib/server/services/ai/suggestions.ts`  | Pre-filter, ranking, fallback                |
| `src/lib/server/services/ai/context.ts`      | Job row to provider shape                    |
| `src/routes/api/v1/me/ai/consent`            | Consent route                                |
| `src/routes/api/v1/me/ai/suggestions`        | Suggestions route                            |
| `src/routes/api/v1/jobs/[jobId]/ai/fit`      | Fit route                                    |
| `src/routes/(app)/me/ai`                     | Consent screen                               |
| `src/routes/(app)/for-you`                   | Suggestion screen                            |
| `src/lib/components/jobs/JobFitPanel.svelte` | Fit panel on the job page                    |

## Build order

1. `cv-text.ts` with PDF and DOCX fixtures. Done.
2. Consent service and withdrawal cleanup. Done.
3. `AiProvider`, a DeepSeek implementation and a fake. Done.
4. `ai/fit`: consent, cache, provider, quote check, daily limit, 15 s timeout. Done.
5. Suggestions: prefilter and local ranking, then AI ranking with the `FALLBACK` path. Done.
6. Consent route/page, suggestions route/page and fit route/panel. Done.

## Open decisions

- Whether scanned CVs should get OCR later; that would change the consent text.
- Prompt tuning against real CVs and real jobs.
- Whether a future model should return a per-suggestion verdict instead of `null`.
