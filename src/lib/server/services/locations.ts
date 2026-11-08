/**
 * Location reads: the canonical places used by job filters and, later,
 * student profiles.
 *
 * Search runs in PostgreSQL with `pg_trgm`, so the browser asks for matches
 * instead of downloading the whole city list. The same interface can later be
 * backed by a larger dataset or a search service.
 */
import { and, asc, eq, or, sql, type SQL } from 'drizzle-orm';
import { normalizeSearchText } from '#lib/search.ts';
import type { Database } from '#lib/server/db/types.ts';
import { locations } from '#lib/server/db/product.schema.ts';

export type LocationRecord = typeof locations.$inferSelect;

export type LocationSummary = {
	id: string;
	name: string;
	displayName: string;
	countryCode: string;
	countryName: string;
	isRemote: boolean;
};

const locationSummarySelection = {
	id: locations.id,
	name: locations.name,
	displayName: locations.displayName,
	countryCode: locations.countryCode,
	countryName: locations.countryName,
	isRemote: locations.isRemote
};

export type LocationSearchOptions = {
	query: string;
	countryCode?: string;
	limit: number;
};

/**
 * Searches active locations by name, aliases or country.
 *
 * An empty query returns the first `limit` places, remote last, so a combobox
 * can show useful options before the person types.
 */
export async function searchLocations(
	database: Database,
	options: LocationSearchOptions
): Promise<LocationSummary[]> {
	const normalizedQuery = normalizeSearchText(options.query);
	const conditions: SQL[] = [eq(locations.isActive, true)];

	if (options.countryCode !== undefined) {
		conditions.push(eq(locations.countryCode, options.countryCode));
	}

	if (normalizedQuery !== '') {
		const matches = or(
			sql`${locations.searchText} % ${normalizedQuery}`,
			sql`${locations.searchText} ilike ${`%${normalizedQuery}%`}`
		);

		if (matches !== undefined) {
			conditions.push(matches);
		}
	}

	const ordering: SQL[] =
		normalizedQuery === ''
			? [asc(locations.isRemote), asc(locations.name)]
			: [
					sql`similarity(${locations.searchText}, ${normalizedQuery}) desc`,
					asc(locations.isRemote),
					asc(locations.name)
				];

	return database
		.select(locationSummarySelection)
		.from(locations)
		.where(and(...conditions))
		.orderBy(...ordering)
		.limit(options.limit);
}

/** Returns one active location, used to label a selected filter. */
export async function findLocationById(
	database: Database,
	locationId: string
): Promise<LocationSummary | null> {
	const [location] = await database
		.select(locationSummarySelection)
		.from(locations)
		.where(and(eq(locations.id, locationId), eq(locations.isActive, true)))
		.limit(1);

	return location ?? null;
}
