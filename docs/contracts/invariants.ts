/**
 * SERVICE INVARIANTS: rules the schema cannot enforce on its own.
 * Each function is one transaction. API handlers call these instead of
 * writing the tables directly, so the rules live in exactly one place.
 *
 * Reference recipes: the shipping services live in `src/lib/server/services/`.
 * This file is the transaction specification they follow, kept free of tests and
 * wiring so the rules read on their own.
 *
 *   acceptApplication  FR-27, FR-28   capacity check + auto FILLED
 *   rejectApplication  FR-27
 *   changeJobStatus    FR-22, FR-29   job state machine + notifies students
 *   submitReport       FR-48, FR-49   3 distinct reporters => auto-hide
 *   createReview       FR-30, FR-31, FR-51   review rules + rating recalculation
 *                                            + signed work record
 *   recalcRating       FR-32, FR-38   average excludes hidden reviews
 *   signRecord / verifyRecord   FR-51, FR-55 (NFR-28)
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { and, avg, count, countDistinct, eq, inArray } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import { users } from '#lib/server/db/auth.schema.ts';
import * as s from '#lib/server/db/product.schema.ts';

export type Db = PgDatabase<PostgresJsQueryResultHKT, typeof s>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Maps 1:1 to the `error.code` values in openapi.yaml. */
export class DomainError extends Error {
	constructor(
		public code:
			| 'NOT_FOUND'
			| 'FORBIDDEN'
			| 'INVALID_STATE_TRANSITION'
			| 'JOB_NOT_HIRING'
			| 'POSITIONS_FULL'
			| 'JOB_NOT_COMPLETED'
			| 'ALREADY_REVIEWED'
			| 'ALREADY_REPORTED'
			| 'NOT_A_PARTICIPANT'
	) {
		super(code);
	}
}

/** Reports a Postgres unique-constraint violation, including one wrapped in `cause`. */
function isUniqueViolation(error: unknown): boolean {
	const candidate = error as { cause?: { code?: string }; code?: string } | null;
	const code = candidate?.cause?.code ?? candidate?.code;

	return code === '23505';
}

/* ---------------- job state machine (section 3.1.12 of the SRS) ---------------- */
export const JOB_TRANSITIONS: Record<
	(typeof s.jobStatus.enumValues)[number],
	{ to: (typeof s.jobStatus.enumValues)[number]; by: 'EMPLOYER' | 'SYSTEM' }[]
> = {
	HIRING: [
		{ to: 'FILLED', by: 'SYSTEM' }, // when accepted = positions_needed
		{ to: 'CANCELLED', by: 'EMPLOYER' }
	],
	FILLED: [
		{ to: 'COMPLETED', by: 'EMPLOYER' },
		{ to: 'CANCELLED', by: 'EMPLOYER' }
	],
	COMPLETED: [],
	CANCELLED: []
};

export async function changeJobStatus(
	db: Db,
	jobId: string,
	employerId: string,
	to: 'COMPLETED' | 'CANCELLED'
) {
	return db.transaction(async (tx) => {
		const [job] = await tx.select().from(s.jobs).where(eq(s.jobs.id, jobId)).for('update');
		if (!job) throw new DomainError('NOT_FOUND');
		if (job.employerId !== employerId) throw new DomainError('FORBIDDEN');
		const ok = JOB_TRANSITIONS[job.status].some((t) => t.to === to && t.by === 'EMPLOYER');
		if (!ok) throw new DomainError('INVALID_STATE_TRANSITION');
		const now = new Date();
		await tx
			.update(s.jobs)
			.set(to === 'COMPLETED' ? { status: to, completedAt: now } : { status: to, cancelledAt: now })
			.where(eq(s.jobs.id, jobId));
		// AC-30.1: students tied to the job hear about the change.
		// COMPLETED -> accepted students; CANCELLED -> pending and accepted students.
		const audience = await tx
			.select({ id: s.applications.studentId })
			.from(s.applications)
			.where(
				and(
					eq(s.applications.jobId, jobId),
					inArray(
						s.applications.status,
						to === 'COMPLETED' ? ['ACCEPTED'] : ['PENDING', 'ACCEPTED']
					)
				)
			);
		if (audience.length)
			await tx.insert(s.notifications).values(
				audience.map((a) => ({
					userId: a.id,
					type: (to === 'COMPLETED' ? 'JOB_COMPLETED' : 'JOB_CANCELLED') as
						'JOB_COMPLETED' | 'JOB_CANCELLED',
					title: `"${job.title}" was ${to === 'COMPLETED' ? 'marked completed' : 'cancelled'}`,
					jobId
				}))
			);
		return { status: to };
	});
}

/* ---------------- applications ---------------- */
export async function acceptApplication(db: Db, applicationId: string, employerId: string) {
	return db.transaction(async (tx) => {
		const [app] = await tx
			.select()
			.from(s.applications)
			.where(eq(s.applications.id, applicationId));
		if (!app) throw new DomainError('NOT_FOUND');
		// Row lock on the JOB serialises concurrent accepts for the same job.
		const [job] = await tx.select().from(s.jobs).where(eq(s.jobs.id, app.jobId)).for('update');
		if (job.employerId !== employerId) throw new DomainError('FORBIDDEN');
		if (app.status !== 'PENDING') throw new DomainError('INVALID_STATE_TRANSITION'); // AC-24.5
		if (job.status !== 'HIRING') throw new DomainError('JOB_NOT_HIRING');
		const [{ accepted }] = await tx
			.select({ accepted: count() })
			.from(s.applications)
			.where(and(eq(s.applications.jobId, job.id), eq(s.applications.status, 'ACCEPTED')));
		if (accepted >= job.positionsNeeded) throw new DomainError('POSITIONS_FULL'); // AC-24.3

		await tx
			.update(s.applications)
			.set({ status: 'ACCEPTED', decidedAt: new Date() })
			.where(eq(s.applications.id, app.id));
		const filled = accepted + 1 >= job.positionsNeeded;
		if (filled) {
			await tx.update(s.jobs).set({ status: 'FILLED' }).where(eq(s.jobs.id, job.id)); // AC-24.4
			const stillPending = await tx
				.select({ id: s.applications.studentId })
				.from(s.applications)
				.where(and(eq(s.applications.jobId, job.id), eq(s.applications.status, 'PENDING')));
			if (stillPending.length)
				await tx.insert(s.notifications).values(
					stillPending.map((p) => ({
						userId: p.id,
						type: 'JOB_FILLED' as const,
						title: `"${job.title}" has found all the people it needs`,
						jobId: job.id
					}))
				);
		}
		await tx.insert(s.notifications).values({
			userId: app.studentId,
			type: 'APPLICATION_ACCEPTED',
			title: `Your application for "${job.title}" was accepted`,
			jobId: job.id,
			applicationId: app.id
		});
		return { filled };
	});
}

export async function rejectApplication(
	db: Db,
	applicationId: string,
	employerId: string,
	reason?: string
) {
	return db.transaction(async (tx) => {
		const [app] = await tx
			.select()
			.from(s.applications)
			.where(eq(s.applications.id, applicationId));
		if (!app) throw new DomainError('NOT_FOUND');
		const [job] = await tx.select().from(s.jobs).where(eq(s.jobs.id, app.jobId)).for('update');
		if (job.employerId !== employerId) throw new DomainError('FORBIDDEN');
		if (app.status !== 'PENDING') throw new DomainError('INVALID_STATE_TRANSITION');
		await tx
			.update(s.applications)
			.set({ status: 'REJECTED', rejectReason: reason ?? null, decidedAt: new Date() })
			.where(eq(s.applications.id, app.id));
		await tx.insert(s.notifications).values({
			userId: app.studentId,
			type: 'APPLICATION_REJECTED',
			title: `Your application for "${job.title}" was not selected`,
			body: reason ?? null,
			jobId: job.id,
			applicationId: app.id
		});
	});
}

/* ---------------- reports (trust layer) ---------------- */
export const AUTO_HIDE_THRESHOLD = 3;

export async function submitReport(db: Db, jobId: string, reporterId: string, reason: string) {
	return db.transaction(async (tx) => {
		const [job] = await tx.select().from(s.jobs).where(eq(s.jobs.id, jobId)).for('update');
		if (!job) throw new DomainError('NOT_FOUND');
		try {
			await tx.insert(s.reports).values({ jobId, reporterId, reason });
		} catch (e) {
			if (isUniqueViolation(e)) throw new DomainError('ALREADY_REPORTED'); // AC-42.2
			throw e;
		}
		const [{ reporters }] = await tx
			.select({ reporters: countDistinct(s.reports.reporterId) })
			.from(s.reports)
			.where(and(eq(s.reports.jobId, jobId), eq(s.reports.status, 'OPEN')));
		const autoHide = reporters >= AUTO_HIDE_THRESHOLD && !job.isHidden; // AC-42.3
		if (autoHide) {
			await tx
				.update(s.jobs)
				.set({
					isHidden: true,
					hiddenBy: null,
					hiddenAt: new Date(),
					hiddenReason: `Auto-hidden: ${reporters} reports`
				})
				.where(eq(s.jobs.id, jobId));
			await tx.insert(s.notifications).values({
				userId: job.employerId,
				type: 'JOB_AUTO_HIDDEN',
				title: `"${job.title}" was hidden after reports and is awaiting review`,
				jobId
			});
		}
		return { autoHidden: autoHide };
	});
}

/* ---------------- reviews + ratings + work record ---------------- */
export async function recalcRating(tx: Tx, userId: string) {
	const [r] = await tx
		.select({ avg: avg(s.reviews.rating), n: count() })
		.from(s.reviews)
		.where(and(eq(s.reviews.revieweeId, userId), eq(s.reviews.isHidden, false)));
	const patch = { ratingAvg: r.n ? Math.round(Number(r.avg) * 100) / 100 : 0, ratingCount: r.n };
	await tx.update(s.studentProfiles).set(patch).where(eq(s.studentProfiles.userId, userId));
	await tx.update(s.employerProfiles).set(patch).where(eq(s.employerProfiles.userId, userId));
}

export async function createReview(
	db: Db,
	secret: string,
	input: { jobId: string; reviewerId: string; revieweeId: string; rating: number; comment?: string }
) {
	return db.transaction(async (tx) => {
		const [job] = await tx.select().from(s.jobs).where(eq(s.jobs.id, input.jobId)).for('update');
		if (!job) throw new DomainError('NOT_FOUND');
		if (job.status !== 'COMPLETED') throw new DomainError('JOB_NOT_COMPLETED'); // AC-26.3

		const acceptedIds = (
			await tx
				.select({ id: s.applications.studentId })
				.from(s.applications)
				.where(and(eq(s.applications.jobId, job.id), eq(s.applications.status, 'ACCEPTED')))
		).map((r) => r.id);
		const studentToEmployer =
			acceptedIds.includes(input.reviewerId) && input.revieweeId === job.employerId;
		const employerToStudent =
			input.reviewerId === job.employerId && acceptedIds.includes(input.revieweeId);
		if (!studentToEmployer && !employerToStudent) throw new DomainError('NOT_A_PARTICIPANT');

		let review: typeof s.reviews.$inferSelect;
		try {
			[review] = await tx
				.insert(s.reviews)
				.values({ ...input, comment: input.comment ?? null })
				.returning();
		} catch (e) {
			if (isUniqueViolation(e)) throw new DomainError('ALREADY_REVIEWED'); // AC-26.2 / 27.2
			throw e;
		}
		await recalcRating(tx, input.revieweeId);
		await tx.insert(s.notifications).values({
			userId: input.revieweeId,
			type: 'REVIEW_RECEIVED',
			title: `You received a ${input.rating}-star review`,
			jobId: job.id
		});

		let recordId: string | null = null;
		if (employerToStudent) {
			// FR-51: the employer's review of the student issues the signed work record
			const [student] = await tx.select().from(users).where(eq(users.id, input.revieweeId));
			const [org] = await tx
				.select()
				.from(s.employerProfiles)
				.where(eq(s.employerProfiles.userId, job.employerId));
			recordId = randomUUID();
			const payload: s.WorkRecordPayload = {
				recordId,
				studentName: student.fullName,
				employerName: org?.orgName ?? 'Employer',
				jobTitle: job.title,
				startDate: job.startDate,
				endDate: job.endDate,
				rating: input.rating,
				comment: input.comment ?? null,
				issuedAt: new Date().toISOString()
			};
			await tx.insert(s.workRecords).values({
				id: recordId,
				jobId: job.id,
				studentId: input.revieweeId,
				employerId: job.employerId,
				reviewId: review.id,
				payload,
				signature: signRecord(payload, secret)
			});
			await tx.insert(s.notifications).values({
				userId: input.revieweeId,
				type: 'WORK_RECORD_CREATED',
				title: `Your verified work record for "${job.title}" is ready`,
				jobId: job.id
			});
		}
		return { review, workRecordId: recordId };
	});
}

/* ---------------- work record signing (NFR-28) ---------------- */
/** Canonical JSON: keys sorted recursively so the signature is stable. */
export function canonicalJson(v: unknown): string {
	if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
	if (v && typeof v === 'object')
		return `{${Object.keys(v as object)
			.sort()
			.map((k) => `${JSON.stringify(k)}:${canonicalJson((v as Record<string, unknown>)[k])}`)
			.join(',')}}`;
	return JSON.stringify(v);
}
export const signRecord = (payload: s.WorkRecordPayload, secret: string) =>
	createHmac('sha256', secret).update(canonicalJson(payload)).digest('hex');

export function verifyRecord(payload: s.WorkRecordPayload, signature: string, secret: string) {
	const a = Buffer.from(signRecord(payload, secret), 'hex');
	const b = Buffer.from(signature, 'hex');
	return a.length === b.length && timingSafeEqual(a, b);
}
