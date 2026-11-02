import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import { users } from '#lib/server/db/auth.schema.ts';
import {
	applications,
	employerProfiles,
	jobs,
	notifications,
	studentProfiles
} from '#lib/server/db/product.schema.ts';

type ApplicationRecord = typeof applications.$inferSelect;
type StudentProfileRecord = typeof studentProfiles.$inferSelect;
type NotificationInsert = typeof notifications.$inferInsert;

export type ApplicationListOptions = {
	studentId: string;
	status?: ApplicationRecord['status'];
	limit: number;
	offset: number;
};

export type ApplicationListRecord = {
	id: string;
	jobId: string;
	jobTitle: string;
	employerOrgName: string | null;
	employerUserName: string;
	status: ApplicationRecord['status'];
	message: string | null;
	rejectReason: string | null;
	cvKey: string | null;
	createdAt: Date;
	decidedAt: Date | null;
};

export type ApplicationPage = {
	items: ApplicationListRecord[];
	total: number;
};

export type ApplicantListOptions = {
	employerId: string;
	jobId: string;
	status?: ApplicationRecord['status'];
	limit: number;
	offset: number;
};

export type ApplicantListRecord = {
	id: string;
	status: ApplicationRecord['status'];
	message: string | null;
	cvKey: string | null;
	createdAt: Date;
	studentName: string;
	studentUniversity: string | null;
	studentMajor: string | null;
	studentRatingAvg: number | null;
	studentRatingCount: number | null;
};

export type ApplicantPage = {
	items: ApplicantListRecord[];
	total: number;
};

export type ApplicantProfileRecord = {
	student: { id: string; name: string };
	profile: StudentProfileRecord | null;
};

export type NewApplicationInput = {
	message: string | null;
	attachCv: boolean;
};

/**
 * Columns shared by every application read.
 *
 * `employerUserName` is the fallback for `employerName` when the employer never
 * created a company profile.
 */
export const applicationSelection = {
	id: applications.id,
	jobId: applications.jobId,
	jobTitle: jobs.title,
	employerOrgName: employerProfiles.orgName,
	employerUserName: users.name,
	status: applications.status,
	message: applications.message,
	rejectReason: applications.rejectReason,
	cvKey: applications.cvKey,
	createdAt: applications.createdAt,
	decidedAt: applications.decidedAt
};

/** Returns one page of a student's applications, newest first. */
export async function listMyApplications(
	database: Database,
	options: ApplicationListOptions
): Promise<ApplicationPage> {
	const conditions: SQL[] = [eq(applications.studentId, options.studentId)];

	if (options.status !== undefined) {
		conditions.push(eq(applications.status, options.status));
	}

	const filters = and(...conditions);

	const [items, totalRows] = await Promise.all([
		database
			.select(applicationSelection)
			.from(applications)
			.innerJoin(jobs, eq(jobs.id, applications.jobId))
			.innerJoin(users, eq(users.id, jobs.employerId))
			.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId))
			.where(filters)
			.orderBy(desc(applications.createdAt), desc(applications.id))
			.limit(options.limit)
			.offset(options.offset),
		database.select({ total: count() }).from(applications).where(filters)
	]);

	return {
		items,
		total: totalRows[0]?.total ?? 0
	};
}

/** Returns the student's application to one job, or null when they have not applied. */
export async function findStudentApplicationForJob(
	database: Database,
	studentId: string,
	jobId: string
): Promise<ApplicationListRecord | null> {
	const [application] = await database
		.select(applicationSelection)
		.from(applications)
		.innerJoin(jobs, eq(jobs.id, applications.jobId))
		.innerJoin(users, eq(users.id, jobs.employerId))
		.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId))
		.where(and(eq(applications.studentId, studentId), eq(applications.jobId, jobId)))
		.limit(1);

	return application ?? null;
}

/** Returns one application of the student by id, or null when it is not theirs. */
export async function findApplicationForStudent(
	database: Database,
	studentId: string,
	applicationId: string
): Promise<ApplicationListRecord | null> {
	const [application] = await database
		.select(applicationSelection)
		.from(applications)
		.innerJoin(jobs, eq(jobs.id, applications.jobId))
		.innerJoin(users, eq(users.id, jobs.employerId))
		.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId))
		.where(and(eq(applications.id, applicationId), eq(applications.studentId, studentId)))
		.limit(1);

	return application ?? null;
}

/** Returns one application by id, used to shape the response after a decision. */
export async function findApplicationById(
	database: Database,
	applicationId: string
): Promise<ApplicationListRecord | null> {
	const [application] = await database
		.select(applicationSelection)
		.from(applications)
		.innerJoin(jobs, eq(jobs.id, applications.jobId))
		.innerJoin(users, eq(users.id, jobs.employerId))
		.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId))
		.where(eq(applications.id, applicationId))
		.limit(1);

	return application ?? null;
}

/**
 * Rejects a pending application.
 *
 * Only the employer who owns the job may decide, and only while the application
 * is `PENDING` (AC-24.5). The reason, when given, is stored on the application
 * and sent with the notification to the student.
 */
export async function rejectApplication(
	database: Database,
	employerId: string,
	applicationId: string,
	reason: string | null
): Promise<ApplicationListRecord> {
	await database.transaction(async (tx) => {
		const [application] = await tx
			.select({
				id: applications.id,
				jobId: applications.jobId,
				studentId: applications.studentId,
				status: applications.status
			})
			.from(applications)
			.where(eq(applications.id, applicationId))
			.for('update');

		if (!application) {
			throw new DomainError('NOT_FOUND');
		}

		const [job] = await tx
			.select({ id: jobs.id, title: jobs.title, employerId: jobs.employerId })
			.from(jobs)
			.where(eq(jobs.id, application.jobId))
			.limit(1);

		if (!job) {
			throw new DomainError('NOT_FOUND');
		}

		// Ownership is checked before the status so a non-owner learns nothing
		// about an application they cannot decide.
		if (job.employerId !== employerId) {
			throw new DomainError('FORBIDDEN');
		}

		if (application.status !== 'PENDING') {
			throw new DomainError('INVALID_STATE_TRANSITION');
		}

		await tx
			.update(applications)
			.set({ status: 'REJECTED', rejectReason: reason, decidedAt: new Date() })
			.where(eq(applications.id, applicationId));

		await tx.insert(notifications).values({
			userId: application.studentId,
			type: 'APPLICATION_REJECTED',
			title: `Your application for "${job.title}" was not accepted`,
			body: reason,
			jobId: job.id,
			applicationId
		});
	});

	const application = await findApplicationById(database, applicationId);

	if (!application) {
		throw new Error('The rejected application could not be read back.');
	}

	return application;
}

/**
 * Returns one page of the applicants to an employer's job, newest first.
 *
 * Throws `NOT_FOUND` for an unknown job and `FORBIDDEN` when the job belongs to
 * someone else, so one employer cannot read another's applicants.
 */
export async function listJobApplicants(
	database: Database,
	options: ApplicantListOptions
): Promise<ApplicantPage> {
	await assertJobOwner(database, options.jobId, options.employerId);

	const conditions: SQL[] = [eq(applications.jobId, options.jobId)];

	if (options.status !== undefined) {
		conditions.push(eq(applications.status, options.status));
	}

	const filters = and(...conditions);

	const [items, totalRows] = await Promise.all([
		database
			.select({
				id: applications.id,
				status: applications.status,
				message: applications.message,
				cvKey: applications.cvKey,
				createdAt: applications.createdAt,
				studentName: users.name,
				studentUniversity: studentProfiles.university,
				studentMajor: studentProfiles.major,
				studentRatingAvg: studentProfiles.ratingAvg,
				studentRatingCount: studentProfiles.ratingCount
			})
			.from(applications)
			.innerJoin(users, eq(users.id, applications.studentId))
			.leftJoin(studentProfiles, eq(studentProfiles.userId, applications.studentId))
			.where(filters)
			.orderBy(desc(applications.createdAt), desc(applications.id))
			.limit(options.limit)
			.offset(options.offset),
		database.select({ total: count() }).from(applications).where(filters)
	]);

	return {
		items,
		total: totalRows[0]?.total ?? 0
	};
}

/**
 * Returns the applicant's profile for an employer who owns the job.
 *
 * Reachable only through an application to one of the caller's jobs; anything
 * else is `403`, even for a guessed id (AC-22.2).
 */
export async function getApplicantProfile(
	database: Database,
	employerId: string,
	applicationId: string
): Promise<ApplicantProfileRecord> {
	const [row] = await database
		.select({
			employerId: jobs.employerId,
			student: users,
			profile: studentProfiles
		})
		.from(applications)
		.innerJoin(jobs, eq(jobs.id, applications.jobId))
		.innerJoin(users, eq(users.id, applications.studentId))
		.leftJoin(studentProfiles, eq(studentProfiles.userId, applications.studentId))
		.where(eq(applications.id, applicationId))
		.limit(1);

	if (!row) {
		throw new DomainError('NOT_FOUND');
	}

	if (row.employerId !== employerId) {
		throw new DomainError('FORBIDDEN');
	}

	return {
		student: {
			id: row.student.id,
			name: row.student.name
		},
		profile: row.profile
	};
}

/**
 * Returns the CV snapshot attached to an application.
 *
 * Allowed for the employer who owns the job and for the student who applied;
 * every other caller gets `403` (AC-23.2). The snapshot is the file attached at
 * apply time, not the student's current profile CV.
 *
 * Throws `NOT_FOUND` for an unknown application or one without a CV.
 */
export async function getApplicationCv(
	database: Database,
	viewer: { id: string; role: 'STUDENT' | 'EMPLOYER' | 'ADMIN' },
	applicationId: string
): Promise<{ key: string; fileName: string }> {
	const [row] = await database
		.select({
			employerId: jobs.employerId,
			studentId: applications.studentId,
			cvKey: applications.cvKey,
			cvFileName: applications.cvFileName
		})
		.from(applications)
		.innerJoin(jobs, eq(jobs.id, applications.jobId))
		.where(eq(applications.id, applicationId))
		.limit(1);

	if (!row) {
		throw new DomainError('NOT_FOUND');
	}

	const isJobOwner = viewer.role === 'EMPLOYER' && row.employerId === viewer.id;
	const isApplicant = viewer.role === 'STUDENT' && row.studentId === viewer.id;

	if (!isJobOwner && !isApplicant) {
		throw new DomainError('FORBIDDEN');
	}

	if (!row.cvKey || !row.cvFileName) {
		throw new DomainError('NOT_FOUND');
	}

	return { key: row.cvKey, fileName: row.cvFileName };
}

/**
 * Creates a `PENDING` application for a student.
 *
 * The CV is copied onto the application so a later replacement or deletion of
 * the profile CV cannot change what the employer received. The employer gets an
 * in-app notification; email delivery is not wired yet.
 *
 * Throws `NOT_FOUND` for an unknown or hidden job, `JOB_NOT_HIRING` when the job
 * is closed, and `ALREADY_APPLIED` when an application is pending, accepted or
 * rejected. A withdrawn application is revived in place, so withdrawing does not
 * permanently block the student from the job.
 */
export async function applyToJob(
	database: Database,
	student: { id: string; name: string },
	jobId: string,
	input: NewApplicationInput
): Promise<ApplicationListRecord> {
	await database.transaction(async (tx) => {
		const [job] = await tx
			.select({
				id: jobs.id,
				title: jobs.title,
				employerId: jobs.employerId,
				status: jobs.status,
				isHidden: jobs.isHidden
			})
			.from(jobs)
			.where(eq(jobs.id, jobId))
			.for('update');

		// A hidden job is invisible in search, so it is also not appliable.
		if (!job || job.isHidden) {
			throw new DomainError('NOT_FOUND');
		}

		if (job.status !== 'HIRING') {
			throw new DomainError('JOB_NOT_HIRING');
		}

		let cvKey: string | null = null;
		let cvFileName: string | null = null;

		if (input.attachCv) {
			// Lock the profile before reading the key. A concurrent CV
			// replacement takes the same lock in saveCv, so this snapshot is
			// either the old file or the new one, never a half-applied change.
			const [profile] = await tx
				.select({ cvKey: studentProfiles.cvKey, cvFileName: studentProfiles.cvFileName })
				.from(studentProfiles)
				.where(eq(studentProfiles.userId, student.id))
				.for('update');

			// Applying without a CV is allowed; the snapshot stays empty.
			if (profile?.cvKey && profile.cvFileName) {
				cvKey = profile.cvKey;
				cvFileName = profile.cvFileName;
			}
		}

		// Relying on the unique constraint instead of a pre-check keeps two
		// concurrent applies from both passing the check and racing the insert.
		//
		// A withdrawn row is revived in place: the student took themselves out and
		// the job is still open. Any other existing row is left untouched, the
		// update matches nothing, and no row is returned.
		const [created] = await tx
			.insert(applications)
			.values({
				jobId,
				studentId: student.id,
				message: input.message,
				cvKey,
				cvFileName
			})
			.onConflictDoUpdate({
				target: [applications.jobId, applications.studentId],
				set: {
					status: 'PENDING',
					message: input.message,
					cvKey,
					cvFileName,
					rejectReason: null,
					decidedAt: null,
					// The revived application is a fresh submission, so it sorts as
					// one in both the student and the employer lists.
					createdAt: new Date()
				},
				setWhere: eq(applications.status, 'WITHDRAWN')
			})
			.returning({ id: applications.id });

		if (!created) {
			throw new DomainError('ALREADY_APPLIED');
		}

		await tx.insert(notifications).values({
			userId: job.employerId,
			type: 'APPLICATION_RECEIVED',
			title: `New application for "${job.title}"`,
			body: `${student.name} applied to your job.`,
			jobId,
			applicationId: created.id
		});
	});

	const application = await findStudentApplicationForJob(database, student.id, jobId);

	if (!application) {
		throw new Error('The new application could not be read back.');
	}

	return application;
}

/**
 * Withdraws the student's own `PENDING` application.
 *
 * Throws `NOT_FOUND` for an unknown id, `FORBIDDEN` when another student owns it,
 * and `INVALID_STATE_TRANSITION` once the employer has decided (AC-14.2). The
 * employer gets an in-app notification.
 */
export async function withdrawApplication(
	database: Database,
	studentId: string,
	applicationId: string
): Promise<ApplicationListRecord> {
	await database.transaction(async (tx) => {
		const [application] = await tx
			.select({
				id: applications.id,
				jobId: applications.jobId,
				studentId: applications.studentId,
				status: applications.status
			})
			.from(applications)
			.where(eq(applications.id, applicationId))
			.for('update');

		if (!application) {
			throw new DomainError('NOT_FOUND');
		}

		if (application.studentId !== studentId) {
			throw new DomainError('FORBIDDEN');
		}

		if (application.status !== 'PENDING') {
			throw new DomainError('INVALID_STATE_TRANSITION');
		}

		await tx
			.update(applications)
			.set({ status: 'WITHDRAWN', decidedAt: new Date() })
			.where(eq(applications.id, applicationId));

		const [job] = await tx
			.select({ id: jobs.id, title: jobs.title, employerId: jobs.employerId })
			.from(jobs)
			.where(eq(jobs.id, application.jobId))
			.limit(1);

		if (job) {
			await tx.insert(notifications).values({
				userId: job.employerId,
				type: 'APPLICATION_WITHDRAWN',
				title: `An applicant withdrew from "${job.title}"`,
				jobId: job.id,
				applicationId
			});
		}
	});

	const application = await findApplicationForStudent(database, studentId, applicationId);

	if (!application) {
		throw new Error('The withdrawn application could not be read back.');
	}

	return application;
}

export type AcceptedApplication = {
	application: ApplicationListRecord;
	jobFilled: boolean;
};

/**
 * Accepts a pending application.
 *
 * The job row is locked before the capacity check, so two accepts for the last
 * position cannot both succeed. Accepting the last needed student moves the job
 * to `FILLED` and tells the remaining pending applicants (AC-24.3, AC-24.4).
 *
 * Lock order is application then job, the same order every write path uses.
 */
export async function acceptApplication(
	database: Database,
	employerId: string,
	applicationId: string
): Promise<AcceptedApplication> {
	let jobFilled = false;

	await database.transaction(async (tx) => {
		const [application] = await tx
			.select({
				id: applications.id,
				jobId: applications.jobId,
				studentId: applications.studentId,
				status: applications.status
			})
			.from(applications)
			.where(eq(applications.id, applicationId))
			.for('update');

		if (!application) {
			throw new DomainError('NOT_FOUND');
		}

		const [job] = await tx
			.select({
				id: jobs.id,
				title: jobs.title,
				employerId: jobs.employerId,
				status: jobs.status,
				positionsNeeded: jobs.positionsNeeded
			})
			.from(jobs)
			.where(eq(jobs.id, application.jobId))
			.for('update');

		if (!job) {
			throw new DomainError('NOT_FOUND');
		}

		// Ownership first, so a non-owner learns nothing about the application.
		if (job.employerId !== employerId) {
			throw new DomainError('FORBIDDEN');
		}

		if (application.status !== 'PENDING') {
			throw new DomainError('INVALID_STATE_TRANSITION');
		}

		if (job.status !== 'HIRING') {
			throw new DomainError('JOB_NOT_HIRING');
		}

		const [counts] = await tx
			.select({ accepted: count() })
			.from(applications)
			.where(and(eq(applications.jobId, job.id), eq(applications.status, 'ACCEPTED')));

		const accepted = counts?.accepted ?? 0;

		if (accepted >= job.positionsNeeded) {
			throw new DomainError('POSITIONS_FULL');
		}

		await tx
			.update(applications)
			.set({ status: 'ACCEPTED', decidedAt: new Date() })
			.where(eq(applications.id, application.id));

		jobFilled = accepted + 1 >= job.positionsNeeded;

		if (jobFilled) {
			await tx.update(jobs).set({ status: 'FILLED' }).where(eq(jobs.id, job.id));

			const stillPending = await tx
				.select({ userId: applications.studentId })
				.from(applications)
				.where(and(eq(applications.jobId, job.id), eq(applications.status, 'PENDING')));

			if (stillPending.length > 0) {
				const pendingNotifications: NotificationInsert[] = stillPending.map(({ userId }) => ({
					userId,
					type: 'JOB_FILLED',
					title: `"${job.title}" has found all the people it needs`,
					jobId: job.id
				}));

				await tx.insert(notifications).values(pendingNotifications);
			}
		}

		await tx.insert(notifications).values({
			userId: application.studentId,
			type: 'APPLICATION_ACCEPTED',
			title: `Your application for "${job.title}" was accepted`,
			jobId: job.id,
			applicationId: application.id
		});
	});

	const application = await findApplicationById(database, applicationId);

	if (!application) {
		throw new Error('The accepted application could not be read back.');
	}

	return { application, jobFilled };
}

/** Throws unless the job exists and belongs to the employer. */
async function assertJobOwner(
	database: Database,
	jobId: string,
	employerId: string
): Promise<void> {
	const [job] = await database
		.select({ employerId: jobs.employerId })
		.from(jobs)
		.where(eq(jobs.id, jobId))
		.limit(1);

	if (!job) {
		throw new DomainError('NOT_FOUND');
	}

	if (job.employerId !== employerId) {
		throw new DomainError('FORBIDDEN');
	}
}
