/**
 * Application reads: the student and employer lists, the applicant profile and
 * the CV attached to an application.
 */
import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import { users } from '#lib/server/db/auth.schema.ts';
import {
	applications,
	employerProfiles,
	jobs,
	studentProfiles
} from '#lib/server/db/product.schema.ts';
import {
	applicationSelection,
	hasReviewedExpression,
	type ApplicationListOptions,
	type ApplicationListRecord,
	type ApplicationPage,
	type ApplicantListOptions,
	type ApplicantPage,
	type ApplicantProfileRecord
} from './selections.ts';

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
				// The employer's review of this student for this job. The job
				// owner is already checked above, so the caller's id is enough.
				hasReviewed: hasReviewedExpression(options.employerId, applications.studentId),
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
