# `.agents/`

Agent workspace: installed skills, review notes and scratch. It is committed, so keep it readable and
free of secrets.

| Path               | Purpose                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| `skills/`          | Installed skills, pinned by `skills-lock.json`                            |
| `schema-review.md` | Review of the database contract against the API contract and toolchain    |
| `decisions/`       | Older copies of decision records; `docs/decisions/` is authoritative      |
| `next-session.md`  | Reminders and unfinished work to surface at the start of the next session |
| `scratch/`         | Throwaway output: generated SQL, diffs, experiments. Safe to delete       |

Rules for this folder:

- Nothing here is part of the application. Do not import from it, and do not make the build depend on
  it.
- When a note becomes a real implementation decision, move it into `src/` (code),
  `docs/decisions/` or `AGENTS.md`, and delete the note.
- The durable contracts live in `docs/contracts/`; this folder holds the reasoning around them.
