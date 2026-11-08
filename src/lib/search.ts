/**
 * Text normalization shared by search and location data.
 *
 * Lowercases, strips Vietnamese diacritics (`đ` included), replaces punctuation
 * with spaces and collapses whitespace. The same function runs on the stored
 * `locations.searchText` and on a query, so `Hồ Chí Minh`, `ho chi minh` and
 * `HCMC`-style aliases land in the same space.
 */
export function normalizeSearchText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'D')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}
