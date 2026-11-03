import { and, count, desc, eq } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database, Transaction } from '#lib/server/db/types.ts';
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

export type SetVisibilityInput = {
	studentId: string;
	recordId: string;
	isPublic: boolean;
};

/**
 * Publishes or hides a student's own work record.
 *
 * `publishedAt` is set when the record first becomes public and cleared when it
 * is hidden again, because the public directory orders by it. A repeated call
 * with the same state keeps the original timestamp, so the record does not jump
 * to the top of the directory. Another student's record answers `NOT_FOUND`
 * rather than `FORBIDDEN`, so the id does not reveal that it exists.
 */
export async function setWorkRecordVisibility(
	database: Database,
	input: SetVisibilityInput
): Promise<WorkRecordRecord> {
	return database.transaction(async (tx) => {
		const [record] = await tx
			.select({
				id: workRecords.id,
				studentId: workRecords.studentId,
				isPublic: workRecords.isPublic
			})
			.from(workRecords)
			.where(eq(workRecords.id, input.recordId))
			.for('update');

		if (!record || record.studentId !== input.studentId) {
			throw new DomainError('NOT_FOUND');
		}

		// A repeated call with the same state leaves the row alone; in particular
		// it must not reset `publishedAt` and move the record in the directory.
		if (record.isPublic === input.isPublic) {
			return requireRecord(tx, record.id);
		}

		const [updated] = await tx
			.update(workRecords)
			.set({
				isPublic: input.isPublic,
				publishedAt: input.isPublic ? new Date() : null
			})
			.where(eq(workRecords.id, record.id))
			.returning();

		if (!updated) {
			throw new Error('The work record could not be updated.');
		}

		return updated;
	});
}

async function requireRecord(
	transaction: Transaction,
	recordId: string
): Promise<WorkRecordRecord> {
	const [record] = await transaction
		.select()
		.from(workRecords)
		.where(eq(workRecords.id, recordId))
		.limit(1);

	if (!record) {
		throw new Error('The work record could not be read back.');
	}

	return record;
}
