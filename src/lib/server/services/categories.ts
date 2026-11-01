import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '#lib/server/db/types.ts';
import { categories } from '#lib/server/db/product.schema.ts';

export type CategoryRecord = typeof categories.$inferSelect;

/** Returns active categories in display order. */
export async function listActiveCategories(database: Database): Promise<CategoryRecord[]> {
	return database
		.select()
		.from(categories)
		.where(eq(categories.isActive, true))
		.orderBy(asc(categories.name));
}

/** Returns a category only when it can still be used for a new job. */
export async function findActiveCategory(
	database: Database,
	categoryId: string
): Promise<CategoryRecord | null> {
	const [category] = await database
		.select()
		.from(categories)
		.where(and(eq(categories.id, categoryId), eq(categories.isActive, true)))
		.limit(1);

	return category ?? null;
}
