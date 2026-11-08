import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import { users } from '#lib/server/db/auth.schema.ts';
import {
	applications,
	employerProfiles,
	jobs,
	notifications,
	reviews,
	workRecords,
	type WorkRecordPayload
} from '#lib/server/db/product.schema.ts';
import { recalculateUserRating } from './ratings.ts';
import { sendNotificationEmails } from '#lib/server/email-notifications.ts';
import type { NotificationInsert } from './notifications.ts';
import { CURRENT_SIGNATURE_VERSION, signWorkRecord } from '#lib/server/work-record-signature.ts';

export type ReviewListRecord = {
	id: string;
	jobId: string;
	reviewerId: string;
	reviewerName: string;
	rating: number;
	comment: string | null;
	createdAt: Date;
};

export type UserReviewPage = {
	items: ReviewListRecord[];
	total: number;
	ratingAvg: number;
	ratingCount: number;
};

export type UserReviewListOptions = {
	userId: string;
	limit: number;
	offset: number;
};

/**
 * Returns a user's visible reviews and their rating summary.
 *
 * Returns `null` when the user does not exist, so the route can answer `404`.
 * Hidden reviews are excluded from the page, the total and the average, which
 * matches the admin removal rule (AC-28.2).
 */
export async function listReviewsForUser(
	database: Database,
	options: UserReviewListOptions
): Promise<UserReviewPage | null> {
	const visibleReviews = and(eq(reviews.revieweeId, options.userId), eq(reviews.isHidden, false));

	const [userRows, items, totalRows, ratingRows] = await Promise.all([
		database.select({ id: users.id }).from(users).where(eq(users.id, options.userId)).limit(1),
		database
			.select({
				id: reviews.id,
				jobId: reviews.jobId,
				reviewerId: reviews.reviewerId,
				reviewerName: users.name,
				rating: reviews.rating,
				comment: reviews.comment,
				createdAt: reviews.createdAt
			})
			.from(reviews)
			.innerJoin(users, eq(users.id, reviews.reviewerId))
			.where(visibleReviews)
			.orderBy(desc(reviews.createdAt), desc(reviews.id))
			.limit(options.limit)
			.offset(options.offset),
		database.select({ total: count() }).from(reviews).where(visibleReviews),
		// `avg` returns `numeric`, which the driver hands back as a string to avoid
		// precision loss. The `float8` cast is what keeps `ratingAvg` a JSON number.
		// Rounding to two decimals matches the `numeric(3, 2)` profile columns, and
		// `coalesce` covers a user with no visible reviews, where `avg` is NULL.
		database
			.select({
				ratingAvg: sql<number>`coalesce(round(avg(${reviews.rating})::numeric, 2), 0)::float8`,
				ratingCount: count()
			})
			.from(reviews)
			.where(visibleReviews)
	]);

	// All four queries run together; the existence check only decides between a
	// page of reviews and a 404, so it does not need its own round trip.
	if (userRows.length === 0) {
		return null;
	}

	const rating = ratingRows[0];

	return {
		items,
		total: totalRows[0]?.total ?? 0,
		ratingAvg: rating?.ratingAvg ?? 0,
		ratingCount: rating?.ratingCount ?? 0
	};
}

export type CreateReviewInput = {
	jobId: string;
	reviewerId: string;
	revieweeId: string;
	rating: number;
	comment: string | null;
};

export type CreatedReview = {
	review: ReviewListRecord;
	workRecordId: string | null;
};

/**
 * Records a review of the other party of a completed job.
 *
 * The reviewer must be the employer or an accepted student of the job, and the
 * reviewee must be the other side. The job row and then the reviewee's user row
 * are locked, so two reviews for the same person on different jobs cannot each
 * recalculate an average that misses the other.
 *
 * When the employer reviews a student, the review also issues the student's
 * signed work record. Both rows are written in the same transaction, so a work
 * record always has the review it was issued from.
 *
 * Throws `NOT_FOUND` for an unknown job, `JOB_NOT_COMPLETED` before the job is
 * completed, `NOT_A_PARTICIPANT` for a pair that is not employer and accepted
 * student, and `ALREADY_REVIEWED` for a repeated review.
 */
export async function createReview(
	database: Database,
	secret: string,
	input: CreateReviewInput
): Promise<CreatedReview> {
	let workRecordId: string | null = null;

	const pendingEmails: NotificationInsert[] = [];

	const review = await database.transaction(async (tx) => {
		const [job] = await tx
			.select({
				id: jobs.id,
				employerId: jobs.employerId,
				title: jobs.title,
				startDate: jobs.startDate,
				endDate: jobs.endDate,
				status: jobs.status
			})
			.from(jobs)
			.where(eq(jobs.id, input.jobId))
			.for('update');

		if (!job) {
			throw new DomainError('NOT_FOUND');
		}

		if (job.status !== 'COMPLETED') {
			throw new DomainError('JOB_NOT_COMPLETED');
		}

		const acceptedStudents = await tx
			.select({ studentId: applications.studentId })
			.from(applications)
			.where(and(eq(applications.jobId, job.id), eq(applications.status, 'ACCEPTED')));

		const isStudentReviewingEmployer =
			input.revieweeId === job.employerId &&
			acceptedStudents.some(({ studentId }) => studentId === input.reviewerId);

		const isEmployerReviewingStudent =
			input.reviewerId === job.employerId &&
			acceptedStudents.some(({ studentId }) => studentId === input.revieweeId);

		if (!isStudentReviewingEmployer && !isEmployerReviewingStudent) {
			throw new DomainError('NOT_A_PARTICIPANT');
		}

		// Locking the reviewee serialises the duplicate check and the rating
		// recalculation for this person. Without the lock, two reviews on
		// different jobs could both pass the check and each write an average
		// computed without the other.
		const [reviewee] = await tx
			.select({ name: users.name })
			.from(users)
			.where(eq(users.id, input.revieweeId))
			.for('update');

		if (!reviewee) {
			throw new DomainError('NOT_FOUND');
		}

		const [existingReview] = await tx
			.select({ id: reviews.id })
			.from(reviews)
			.where(
				and(
					eq(reviews.jobId, job.id),
					eq(reviews.reviewerId, input.reviewerId),
					eq(reviews.revieweeId, input.revieweeId)
				)
			)
			.limit(1);

		if (existingReview) {
			throw new DomainError('ALREADY_REVIEWED');
		}

		const [created] = await tx
			.insert(reviews)
			.values({
				jobId: job.id,
				reviewerId: input.reviewerId,
				revieweeId: input.revieweeId,
				rating: input.rating,
				comment: input.comment
			})
			.returning({
				id: reviews.id,
				jobId: reviews.jobId,
				reviewerId: reviews.reviewerId,
				rating: reviews.rating,
				comment: reviews.comment,
				createdAt: reviews.createdAt
			});

		if (!created) {
			throw new Error('The review could not be written.');
		}

		await recalculateUserRating(tx, input.revieweeId);

		const reviewNotification: NotificationInsert = {
			userId: input.revieweeId,
			type: 'REVIEW_RECEIVED',
			title: `You received a ${input.rating}-star review`,
			jobId: job.id
		};

		await tx.insert(notifications).values(reviewNotification);
		pendingEmails.push(reviewNotification);

		if (isEmployerReviewingStudent) {
			const [employerProfile] = await tx
				.select({ orgName: employerProfiles.orgName })
				.from(employerProfiles)
				.where(eq(employerProfiles.userId, job.employerId));

			workRecordId = randomUUID();

			// FR-51: the employer's review of the student is what the signed
			// record certifies, so the payload copies the review and the job.
			const payload: WorkRecordPayload = {
				recordId: workRecordId,
				studentName: reviewee.name,
				employerName: employerProfile?.orgName ?? 'Employer',
				jobTitle: job.title,
				startDate: job.startDate,
				endDate: job.endDate,
				rating: input.rating,
				comment: input.comment,
				issuedAt: new Date().toISOString()
			};

			await tx.insert(workRecords).values({
				id: workRecordId,
				jobId: job.id,
				studentId: input.revieweeId,
				employerId: job.employerId,
				reviewId: created.id,
				payload,
				signature: signWorkRecord(payload, secret),
				signatureVersion: CURRENT_SIGNATURE_VERSION
			});

			const recordNotification: NotificationInsert = {
				userId: input.revieweeId,
				type: 'WORK_RECORD_CREATED',
				title: `Your verified work record for "${job.title}" is ready`,
				jobId: job.id
			};

			await tx.insert(notifications).values(recordNotification);
			pendingEmails.push(recordNotification);
		}

		const [reviewer] = await tx
			.select({ name: users.name })
			.from(users)
			.where(eq(users.id, input.reviewerId));

		if (!reviewer) {
			throw new DomainError('NOT_FOUND');
		}

		return { ...created, reviewerName: reviewer.name };
	});

	await sendNotificationEmails(database, pendingEmails);

	return { review, workRecordId };
}
