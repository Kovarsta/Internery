import { desc, eq } from 'drizzle-orm';
import type { Database } from '#lib/server/db/types.ts';
import { verificationRequests } from '#lib/server/db/product.schema.ts';

export type VerificationRequestRecord = typeof verificationRequests.$inferSelect;

/** Returns the employer's latest verification request, or null when none exists. */
export async function findLatestVerificationRequest(
	database: Database,
	employerId: string
): Promise<VerificationRequestRecord | null> {
	const [request] = await database
		.select()
		.from(verificationRequests)
		.where(eq(verificationRequests.employerId, employerId))
		.orderBy(desc(verificationRequests.createdAt), desc(verificationRequests.id))
		.limit(1);

	return request ?? null;
}
