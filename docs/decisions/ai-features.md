# AI features

Date: 2026-11-03

Status: planned; none of the endpoints are implemented.

## Scope

Four operations:

- `GET /me/ai/consent`, `PUT /me/ai/consent`
- `GET /me/ai/suggestions`
- `GET /jobs/{jobId}/ai/fit`

The rules live in `contracts/openapi.yaml` (AI section); this file records the implementation
choices.

## Provider

DeepSeek, through its OpenAI-compatible API.

- Base URL `https://api.deepseek.com`
- Model `deepseek-flash` by default; `deepseek-v4-pro` can be selected with env.
- `response_format: { type: 'json_object' }`, and the prompt must also ask for JSON. DeepSeek's JSON
  mode requires both.
- Disable thinking for this task; it is classification, not reasoning.
- Env: `DEEPSEEK_API_KEY`, optional `DEEPSEEK_MODEL`.

The provider sits behind an `AiProvider` interface. Tests use a fake implementation, so the suite
never calls DeepSeek.

## CV text extraction

PDF and DOCX need different tools.

- **PDF**: `@firecrawl/pdf-inspector` — the local napi-rs library, MIT, no API key. It is not the
  hosted Firecrawl API.
  - `classifyPdfAsync` first: `Scanned` or `ImageBased` means there is no text to extract, so answer
    `422 CV_UNREADABLE` instead of calling the model.
  - `extractPagesMarkdownAsync` or `extractTextWithPositionsAsync` for the text.
  - Prebuilt binaries cover Windows x64, Linux x64/ARM64 and macOS ARM64.
- **DOCX**: `mammoth.extractRawText({ buffer })`.

Considered and rejected:

- The hosted Firecrawl API: the CV would leave the server before redaction, adding a second vendor
  to the consent statement.
- `unpdf`: pure JS and simpler to deploy, but no scan classification and weaker reading order. It
  stays the fallback if the native package causes deployment trouble.

## Privacy and correctness

- Extract on our server, then remove the student's name, phone and email before sending anything.
- `cvHash` is sha256 of the redacted text, not of the raw file.
- Every `cvQuote` must appear in the redacted text. Normalise whitespace and markdown markers before
  checking; reasons that fail are dropped.
- Results are cached per (student, job, cvHash). Cache hits do not count toward the daily limit.
- No OCR in this phase: a scanned CV is `CV_UNREADABLE`.

## Build order

1. `cv-text.ts` with PDF and DOCX fixtures.
2. Consent endpoints; withdrawal deletes cached explanations.
3. `AiProvider`, a DeepSeek implementation and a fake.
4. `ai/fit`: consent, cache, provider, quote check, daily limit, 15 s timeout.
5. Suggestions: prefilter open jobs by major/skills, ship the `FALLBACK` path first, add AI ranking
   second.

## Open decisions

- Daily limits per student (numbers).
- Prompt and JSON schema for fit and suggestions.
- Whether suggestions should ever cost a provider call, or stay a local ranking.
- Whether scanned CVs should get OCR later; that would change the consent text.
