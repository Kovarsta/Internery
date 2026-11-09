/**
 * Admin user management: search accounts and apply or lift an admin lock.
 *
 * A lock sets `users.status = LOCKED`, which the API guard rejects on the next
 * request, and records the actor, time and reason in `user_moderation`. The
 * moderation row is created on the first lock; a missing row means the account
 * was never locked.
 */
import { and, count, desc, eq, or, type SQL } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import { containsText } from '#lib/server/api/sql.ts';
import type { Database } from '#lib/server/db/types.ts';
import { users } from '#lib/server/db/auth.schema.ts';
import { userModeration } from '#lib/server/db/product.schema.ts';
import { recordAuditLog } from './audit.ts';

export type AdminUserRecord = {
	id: string;
	email: string;
	name: string;
	role: 'STUDENT' | 'EMPLOYER' | 'ADMIN';
	status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'LOCKED' | 'DELETED';
	lockedAt: Date | null;
	lockReason: string | null;
	createdAt: Date;
};

export type AdminUserListOptions = {
	query?: string;
	role?: AdminUserRecord['role'];
	status?: AdminUserRecord['status'];
	limit: number;
	offset: number;
};

export type AdminUserPage = {
	items: AdminUserRecord[];
	total: number;
};

export type LockUserInput = {
	adminId: string;
	userId: string;
	reason: string | null;
};

export type UnlockUserInput = {
	adminId: string;
	userId: string;
};

const adminUserSelection = {
	id: users.id,
	email: users.email,
	name: users.name,
	role: users.role,
	status: users.status,
	lockedAt: userModeration.lockedAt,
	lockReason: userModeration.lockReason,
	createdAt: users.createdAt
};

/**
 * Returns one page of accounts, newest first, optionally filtered.
 *
 * The search is a literal, case-insensitive substring of the name or email.
 * One `filters` value drives both the page query and the total count, so the
 * list and the count cannot drift.
 *
 * @param options - Search text, role/status filters, and pagination.
 * @returns The requested page and the total number of matching accounts.
 */
export async function listAdminUsers(
	database: Database,
	options: AdminUserListOptions
): Promise<AdminUserPage> {
	const conditions: SQL[] = [];

	if (options.query !== undefined) {
		const search = or(
			containsText(users.name, options.query),
			containsText(users.email, options.query)
		);

		if (search) {
			conditions.push(search);
		}
	}

	if (options.role !== undefined) {
		conditions.push(eq(users.role, options.role));
	}

	if (options.status !== undefined) {
		conditions.push(eq(users.status, options.status));
	}

	const filters = and(...conditions);

	const [items, totalRows] = await Promise.all([
		database
			.select(adminUserSelection)
			.from(users)
			.leftJoin(userModeration, eq(userModeration.userId, users.id))
			.where(filters)
			.orderBy(desc(users.createdAt), desc(users.id))
			.limit(options.limit)
			.offset(options.offset),
		database.select({ total: count() }).from(users).where(filters)
	]);

	return {
		items,
		total: totalRows[0]?.total ?? 0
	};
}

/** Returns one account with its moderation fields, or null when it does not exist. */
export async function findAdminUser(
	database: Database,
	userId: string
): Promise<AdminUserRecord | null> {
	const [user] = await database
		.select(adminUserSelection)
		.from(users)
		.leftJoin(userModeration, eq(userModeration.userId, users.id))
		.where(eq(users.id, userId))
		.limit(1);

	return user ?? null;
}

/**
 * Locks an account and writes the audit entry.
 *
 * Administrator accounts are refused: locking the last admin would leave the
 * platform without moderation, and an admin locking themselves is always a
 * mistake. A second lock of the same account is a state conflict rather than a
 * silent no-op, so the caller sees that the lock did not newly apply.
 */
export async function lockUser(database: Database, input: LockUserInput): Promise<AdminUserRecord> {
	if (input.userId === input.adminId) {
		throw new DomainError('INVALID_STATE_TRANSITION', 'You cannot lock your own account.');
	}

	await database.transaction(async (tx) => {
		const [target] = await tx
			.select({
				id: users.id,
				role: users.role,
				status: users.status
			})
			.from(users)
			.where(eq(users.id, input.userId))
			.for('update');

		if (!target) {
			throw new DomainError('NOT_FOUND');
		}

		if (target.role === 'ADMIN') {
			throw new DomainError('INVALID_STATE_TRANSITION', 'Administrator accounts cannot be locked.');
		}

		if (target.status === 'LOCKED') {
			throw new DomainError('INVALID_STATE_TRANSITION', 'The account is already locked.');
		}

		const lockedAt = new Date();

		await tx
			.insert(userModeration)
			.values({
				userId: input.userId,
				lockedAt,
				lockedBy: input.adminId,
				lockReason: input.reason
			})
			.onConflictDoUpdate({
				target: userModeration.userId,
				set: {
					lockedAt,
					lockedBy: input.adminId,
					lockReason: input.reason
				}
			});

		await tx.update(users).set({ status: 'LOCKED' }).where(eq(users.id, input.userId));

		await recordAuditLog(tx, {
			actorId: input.adminId,
			action: 'USER_LOCKED',
			targetType: 'USER',
			targetId: input.userId,
			metadata: { reason: input.reason }
		});
	});

	const user = await findAdminUser(database, input.userId);

	if (!user) {
		throw new Error('The locked account could not be read back.');
	}

	return user;
}

/**
 * Lifts an admin lock and clears any temporary login lockout.
 *
 * The account returns to `ACTIVE` only when its address is verified; otherwise
 * it goes back to `PENDING_VERIFICATION`, so an unverified account cannot skip
 * the verification step by being locked and unlocked.
 */
export async function unlockUser(
	database: Database,
	input: UnlockUserInput
): Promise<AdminUserRecord> {
	await database.transaction(async (tx) => {
		const [target] = await tx
			.select({
				id: users.id,
				emailVerified: users.emailVerified,
				status: users.status
			})
			.from(users)
			.where(eq(users.id, input.userId))
			.for('update');

		if (!target) {
			throw new DomainError('NOT_FOUND');
		}

		if (target.status !== 'LOCKED') {
			throw new DomainError('INVALID_STATE_TRANSITION', 'The account is not locked.');
		}

		await tx
			.update(userModeration)
			.set({
				failedLoginCount: 0,
				lockedUntil: null,
				lockedAt: null,
				lockedBy: null,
				lockReason: null
			})
			.where(eq(userModeration.userId, input.userId));

		await tx
			.update(users)
			.set({ status: target.emailVerified ? 'ACTIVE' : 'PENDING_VERIFICATION' })
			.where(eq(users.id, input.userId));

		await recordAuditLog(tx, {
			actorId: input.adminId,
			action: 'USER_UNLOCKED',
			targetType: 'USER',
			targetId: input.userId
		});
	});

	const user = await findAdminUser(database, input.userId);

	if (!user) {
		throw new Error('The unlocked account could not be read back.');
	}

	return user;
}
