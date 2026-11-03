/**
 * Admin verification queue.
 *
 * Approving marks the employer profile `VERIFIED`; rejecting stores the reason
 * and lets the employer submit again (AC-40.2, AC-40.3). Both decisions notify
 * the employer and write an audit entry in the same transaction.
 */
import { and, asc, count, eq, type SQL } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database, Transaction } from '#lib/server/db/types.ts';
import {
	employerProfiles,
	notifications,
	verificationRequests
} from '#lib/server/db/product.schema.ts';
import { recordAuditLog } from './audit.ts';

export type VerificationRequestRecord = typeof verificationRequests.$inferSelect;

export type VerificationListOptions = {
	status?: VerificationRequestRecord['status'];
	limit: number;
	offset: number;
};

export type VerificationPage = {
	items: VerificationRequestRecord[];
	total: number;
};

export type ApproveVerificationInput = {
	adminId: string;
	requestId: string;
};

export type RejectVerificationInput = {
	adminId: string;
	requestId: string;
	reason: string;
};

/** Returns one page of requests, oldest first so the queue is fair. */
export async function listVerificationRequests(
	database: Database,
	options: VerificationListOptions
): Promise<VerificationPage> {
	const conditions: SQL[] = [];

	if (options.status !== undefined) {
		conditions.push(eq(verificationRequests.status, options.status));
	}

	const filters = and(...conditions);

	const [items, totalRows] = await Promise.all([
		database
			.select()
			.from(verificationRequests)
			.where(filters)
			.orderBy(asc(verificationRequests.createdAt), asc(verificationRequests.id))
			.limit(options.limit)
			.offset(options.offset),
		database.select({ total: count() }).from(verificationRequests).where(filters)
	]);

	return {
		items,
		total: totalRows[0]?.total ?? 0
	};
}

/** Approves a pending request and marks the employer profile verified. */
export async function approveVerification(
	database: Database,
	input: ApproveVerificationInput
): Promise<VerificationRequestRecord> {
	await database.transaction(async (tx) => {
		const request = await lockPendingRequest(tx, input.requestId);
		const reviewedAt = new Date();

		await tx
			.update(verificationRequests)
			.set({ status: 'APPROVED', rejectReason: null, reviewedBy: input.adminId, reviewedAt })
			.where(eq(verificationRequests.id, request.id));

		await tx
			.update(employerProfiles)
			.set({ verificationStatus: 'VERIFIED', verifiedAt: reviewedAt })
			.where(eq(employerProfiles.userId, request.employerId));

		await tx.insert(notifications).values({
			userId: request.employerId,
			type: 'VERIFICATION_APPROVED',
			title: 'Your organisation is verified'
		});

		await recordAuditLog(tx, {
			actorId: input.adminId,
			action: 'VERIFICATION_APPROVED',
			targetType: 'VERIFICATION_REQUEST',
			targetId: request.id
		});
	});

	return requireRequest(database, input.requestId);
}

/** Rejects a pending request and stores the reason for the employer. */
export async function rejectVerification(
	database: Database,
	input: RejectVerificationInput
): Promise<VerificationRequestRecord> {
	await database.transaction(async (tx) => {
		const request = await lockPendingRequest(tx, input.requestId);

		await tx
			.update(verificationRequests)
			.set({
				status: 'REJECTED',
				rejectReason: input.reason,
				reviewedBy: input.adminId,
				reviewedAt: new Date()
			})
			.where(eq(verificationRequests.id, request.id));

		await tx
			.update(employerProfiles)
			.set({ verificationStatus: 'REJECTED', verifiedAt: null })
			.where(eq(employerProfiles.userId, request.employerId));

		await tx.insert(notifications).values({
			userId: request.employerId,
			type: 'VERIFICATION_REJECTED',
			title: 'Your verification request was rejected',
			body: input.reason
		});

		await recordAuditLog(tx, {
			actorId: input.adminId,
			action: 'VERIFICATION_REJECTED',
			targetType: 'VERIFICATION_REQUEST',
			targetId: request.id,
			metadata: { reason: input.reason }
		});
	});

	return requireRequest(database, input.requestId);
}

type LockedRequest = {
	id: string;
	employerId: string;
};

/**
 * Locks a request that is still pending.
 *
 * The row lock makes two admins deciding at the same time race safely: the
 * second one sees the decided status and gets a conflict instead of overwriting
 * the first decision.
 */
async function lockPendingRequest(
	transaction: Transaction,
	requestId: string
): Promise<LockedRequest> {
	const [request] = await transaction
		.select({
			id: verificationRequests.id,
			employerId: verificationRequests.employerId,
			status: verificationRequests.status
		})
		.from(verificationRequests)
		.where(eq(verificationRequests.id, requestId))
		.for('update');

	if (!request) {
		throw new DomainError('NOT_FOUND');
	}

	if (request.status !== 'PENDING') {
		throw new DomainError('INVALID_STATE_TRANSITION', 'This request has already been decided.');
	}

	return request;
}

async function requireRequest(
	database: Database,
	requestId: string
): Promise<VerificationRequestRecord> {
	const [request] = await database
		.select()
		.from(verificationRequests)
		.where(eq(verificationRequests.id, requestId))
		.limit(1);

	if (!request) {
		throw new Error('The verification request could not be read back.');
	}

	return request;
}
