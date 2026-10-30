import { and, count, desc, eq } from 'drizzle-orm';
import type { Database } from '#lib/server/db/types.ts';
import { workRecords } from '#lib/server/db/product.schema.ts';

export type WorkRecordRecord = typeof workRecords.$inferSelect;

export type WorkRecordPage = {
	items: WorkRecordRecord[];
	total: number;
};

export type WorkRecordListOptions = {
	limit: number;
	offset: number;
};

/** Returns one page of a student's own work records, newest first. */
export async function listStudentWorkRecords(
	database: Database,
	studentId: string,
	options: WorkRecordListOptions
): Promise<WorkRecordPage> {
	const filters = eq(workRecords.studentId, studentId);

	const [items, totalRows] = await Promise.all([
		database
			.select()
			.from(workRecords)
			.where(filters)
			.orderBy(desc(workRecords.createdAt), desc(workRecords.id))
			.limit(options.limit)
			.offset(options.offset),
		database.select({ total: count() }).from(workRecords).where(filters)
	]);

	return {
		items,
		total: totalRows[0]?.total ?? 0
	};
}

/**
 * Returns one page of the public work-record directory.
 *
 * The database check constraint guarantees `publishedAt` is set for public
 * records, so ordering by it is safe.
 */
export async function listPublicWorkRecords(
	database: Database,
	options: WorkRecordListOptions
): Promise<WorkRecordPage> {
	const filters = eq(workRecords.isPublic, true);

	const [items, totalRows] = await Promise.all([
		database
			.select()
			.from(workRecords)
			.where(filters)
			.orderBy(desc(workRecords.publishedAt), desc(workRecords.id))
			.limit(options.limit)
			.offset(options.offset),
		database.select({ total: count() }).from(workRecords).where(filters)
	]);

	return {
		items,
		total: totalRows[0]?.total ?? 0
	};
}

/** Returns a public work record, or null when it is missing or private. */
export async function findPublicWorkRecord(
	database: Database,
	recordId: string
): Promise<WorkRecordRecord | null> {
	const [record] = await database
		.select()
		.from(workRecords)
		.where(and(eq(workRecords.id, recordId), eq(workRecords.isPublic, true)))
		.limit(1);

	return record ?? null;
}
