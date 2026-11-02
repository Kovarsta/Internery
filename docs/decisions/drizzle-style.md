# Drizzle query style

Date: 2026-11-02

Status: accepted.

## Principle

Services query through Drizzle's builder and return their own record types. Routes never see a
table row type, and nothing runs until the query is awaited.

## Tables are values, not types

`pgTable(...)` returns a runtime object that describes a table and its columns:

```ts
export const studentProfiles = pgTable('student_profiles', { ... });
```

- `studentProfiles` describes the table.
- `studentProfiles.cvKey` describes one column: its SQL name and its TypeScript type.
- Neither is data. They are inputs to the builder.

## Projections rename and shape

```ts
const [profile] = await database
	.select({
		key: studentProfiles.cvKey,
		fileName: studentProfiles.cvFileName
	})
	.from(studentProfiles)
	.where(eq(studentProfiles.userId, studentId));
```

This compiles to one statement:

```sql
SELECT "cvKey", "cvFileName" FROM "student_profiles" WHERE "userId" = $1;
```

The object passed to `select` is a projection. Each property names an output field, and the column
object on the right supplies both the SQL column and the TypeScript type. Drizzle infers the row
type, including nullability, from the schema.

## Nullability is narrowed at the boundary

A nullable column comes back as `string | null`. The service checks the values it needs, then returns
its own type with non-null fields:

```ts
if (!profile?.key || !profile.fileName) {
	return null;
}

return { key: profile.key, fileName: profile.fileName, mimeType: profile.mimeType };
```

That is why `CvRecord.key` is `string` while `studentProfiles.cvKey` is `string | null`.

## Why not return the row type

- The API contract, not the schema, decides what a service returns.
- Renaming at the projection keeps call sites readable (`cv.key` rather than `cv.cvKey`).
- A schema change then breaks one service instead of leaking into routes and tests.

## Repeated table references are one query

`studentProfiles` appears in `select`, `from` and `where` because each clause names its own table and
columns. That is still one round trip. The chain is only compiled when awaited.
