# Canonical locations

Date: 2026-11-09

## Context

Job locations were free text. “Ho Chi Minh City”, “HCM” and “Saigon” could all appear as different
places, and a category/location filter could not rely on the value. The next step is a global city
set, so a client-side static list would stop working: it would grow without bound and the browser
would carry data it does not need.

## Decision

### Database reference, not free text

`locations` stores canonical places:

- `id` is the stable key; jobs will reference `locationId`.
- `countryCode` and `countryName` keep the model usable outside Vietnam.
- `name` is the short label (`Hanoi`); `displayName` adds the country for disambiguation.
- `slug` is unique per country.
- `aliases` holds common forms such as `HCM`, `HCMC`, `TP.HCM`, `Saigon`.
- `searchText` is the normalized name + aliases + country.

`searchText` is normalized with `src/lib/search.ts`: lowercase, Vietnamese diacritics stripped
(`đ` included), punctuation to spaces, whitespace collapsed.

### Server-side search

`GET /locations?q=` searches with PostgreSQL `pg_trgm`:

- `search_text % normalized_query` for typo tolerance;
- `search_text ILIKE %normalized_query%` for substring matches;
- `similarity()` orders the results.

`GET /locations/{locationId}` returns one row, used to label a selected filter.

The client never downloads the city list. A combobox calls the endpoint as the user types. The same
endpoint can later be backed by a larger import or a search service without changing the UI.

### Basic data now, global later

The migration seeds seven places: Hanoi, Ho Chi Minh City, Da Nang, Hai Phong, Can Tho, Hue and
Online. The schema already has `countryCode`, `aliases` and `searchText`, so adding countries is a
data import, not a schema rewrite.

## Trade-offs

- **City level only.** No districts or wards yet. If jobs need a street address, add an optional
  detail field; keep the canonical city for filtering.
- **No lat/lng or timezone yet.** They become useful for distance-based suggestions and local shift
  times; add them when those features land.
- **No runtime address package.** `vietnam-address-database` and `vn-address-kit` are useful for
  generating data, but city-level search does not justify their runtime weight. Revisit for
  ward-level addresses.
- **Jobs still store text at the time of this record.** The next slice adds `locationId`, backfills
  the existing canonical names and drops the text column.
