/**
 * Admin category management: add, rename, deactivate and delete.
 *
 * Categories are never deleted while a job uses them; the admin deactivates
 * them instead, which hides them from the public list and from new-job forms
 * while existing jobs keep their category (AC-34.2, AC-34.3).
 */
import { asc, eq } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import { isForeignKeyViolation, isUniqueViolation } from '#lib/server/db/errors.ts';
import { categories } from '#lib/server/db/product.schema.ts';

export type CategoryRecord = typeof categories.$inferSelect;

export type CreateCategoryInput = {
	name: string;
};

export type UpdateCategoryInput = {
	name?: string;
	isActive?: boolean;
};

/** Returns every category, active or not, in display order. */
export async function listAllCategories(database: Database): Promise<CategoryRecord[]> {
	return database.select().from(categories).orderBy(asc(categories.name), asc(categories.id));
}

/**
 * Adds a category.
 *
 * Names are unique case-insensitively through a database index, so `Retail` and
 * `retail` collide. The violation maps to `NAME_TAKEN` instead of surfacing as
 * an internal error.
 */
export async function createCategory(
	database: Database,
	input: CreateCategoryInput
): Promise<CategoryRecord> {
	try {
		const [created] = await database.insert(categories).values({ name: input.name }).returning();

		if (!created) {
			throw new Error('The category could not be written.');
		}

		return created;
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new DomainError('NAME_TAKEN', 'A category with that name already exists.');
		}

		throw error;
	}
}

/**
 * Renames a category or changes its active state.
 *
 * The update is partial: a request that only flips `isActive` keeps the current
 * name, and the reverse is also true.
 */
export async function updateCategory(
	database: Database,
	categoryId: string,
	input: UpdateCategoryInput
): Promise<CategoryRecord> {
	const patch: Partial<typeof categories.$inferInsert> = {};

	if (input.name !== undefined) {
		patch.name = input.name;
	}

	if (input.isActive !== undefined) {
		patch.isActive = input.isActive;
	}

	try {
		const [updated] = await database
			.update(categories)
			.set(patch)
			.where(eq(categories.id, categoryId))
			.returning();

		if (!updated) {
			throw new DomainError('NOT_FOUND');
		}

		return updated;
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new DomainError('NAME_TAKEN', 'A category with that name already exists.');
		}

		throw error;
	}
}

/**
 * Deletes a category that no job uses.
 *
 * The foreign key from `jobs` is `ON DELETE RESTRICT`, so the delete itself is
 * the check: if a job still points at the category, PostgreSQL refuses and the
 * caller gets `CATEGORY_IN_USE`. A missing category answers `NOT_FOUND`.
 */
export async function deleteCategory(database: Database, categoryId: string): Promise<void> {
	try {
		const deleted = await database
			.delete(categories)
			.where(eq(categories.id, categoryId))
			.returning({ id: categories.id });

		if (deleted.length === 0) {
			throw new DomainError('NOT_FOUND');
		}
	} catch (error) {
		if (isForeignKeyViolation(error)) {
			throw new DomainError('CATEGORY_IN_USE');
		}

		throw error;
	}
}
