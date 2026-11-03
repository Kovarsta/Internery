/**
 * Audit trail for administrative actions.
 *
 * Every admin write that the contract calls "audited" records one row with the
 * actor, the target and a short metadata object. The audit entry is written in
 * the same transaction as the change, so a change can never exist without its
 * record.
 */
import type { Transaction } from '#lib/server/db/types.ts';
import { auditLogs } from '#lib/server/db/product.schema.ts';

export type AuditAction =
	| 'USER_LOCKED'
	| 'USER_UNLOCKED'
	| 'JOB_HIDDEN'
	| 'JOB_RESTORED'
	| 'JOB_FLAG_CLEARED'
	| 'REVIEW_REMOVED'
	| 'VERIFICATION_APPROVED'
	| 'VERIFICATION_REJECTED';

export type AuditTarget = 'USER' | 'JOB' | 'REVIEW' | 'VERIFICATION_REQUEST';

export type AuditEntry = {
	actorId: string;
	action: AuditAction;
	targetType: AuditTarget;
	targetId: string;
	metadata?: Record<string, unknown>;
};

/** Appends one audit-log row inside the caller's transaction. */
export async function recordAuditLog(transaction: Transaction, entry: AuditEntry): Promise<void> {
	await transaction.insert(auditLogs).values({
		actorId: entry.actorId,
		action: entry.action,
		targetType: entry.targetType,
		targetId: entry.targetId,
		metadata: entry.metadata ?? null
	});
}
