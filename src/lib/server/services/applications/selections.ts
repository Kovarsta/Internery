/**
 * `EXISTS` for a review by one participant of a job about the other.
 *
 * Why this is raw SQL: joining `reviews` could duplicate an application when
 * more than one review matches. `exists` keeps exactly one row per application.
 *
 * @param reviewerId - The review author, as a column or a bound user id.
 * @param revieweeId - The person being reviewed, as a column or a bound user id.
 * @returns A boolean SQL expression for the current application/job row.
 */
export function hasReviewedExpression(
	reviewerId: SQLWrapper | string,
	revieweeId: SQLWrapper | string
): SQL<boolean> {
	return sql<boolean>`exists (
		select 1 from ${reviews}
		where ${reviews.jobId} = ${applications.jobId}
			and ${reviews.reviewerId} = ${reviewerId}
			and ${reviews.revieweeId} = ${revieweeId}
	)`;
}

/**
 * Column selections and record types shared by the application reads and writes.
 *
 * The row types are exported for the sibling modules only; `index.ts` keeps
 * them out of the public service API.
 */
import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { users } from '#lib/server/db/auth.schema.ts';
import {
	applications,
	employerProfiles,
	jobs,
	notifications,
	reviews,
	studentProfiles
} from '#lib/server/db/product.schema.ts';

type ApplicationRecord = typeof applications.$inferSelect;
type StudentProfileRecord = typeof studentProfiles.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;

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
	hasReviewed: boolean;
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
	hasReviewed: boolean;
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
 * created a company profile. `hasReviewed` asks whether this student already
 * reviewed the employer for the job, so the job page can show the finished
 * state instead of a form that would answer `409`.
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
	hasReviewed: hasReviewedExpression(applications.studentId, jobs.employerId),
	createdAt: applications.createdAt,
	decidedAt: applications.decidedAt
};
