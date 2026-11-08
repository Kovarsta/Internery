/**
 * Column selections and record types shared by the job reads and writes.
 *
 * The row types are exported for the sibling modules only; `index.ts` keeps
 * them out of the public service API.
 */
import { sql, type SQL } from 'drizzle-orm';
import type { DayOfWeek, TimeOfDay } from '#lib/schedule.ts';
import {
	applications,
	categories,
	employerProfiles,
	jobs,
	notifications
} from '#lib/server/db/product.schema.ts';

export type JobRecord = typeof jobs.$inferSelect;
export type ApplicationRecord = typeof applications.$inferSelect;
type EmployerProfileRecord = typeof employerProfiles.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;

export type JobSummaryRecord = {
	id: string;
	title: string;
	location: string;
	daysOfWeek: JobRecord['daysOfWeek'];
	startTime: string;
	endTime: string;
	salaryAmount: number;
	salaryType: JobRecord['salaryType'];
	startDate: string;
	endDate: string;
	positionsNeeded: number;
	acceptedCount: number;
	status: JobRecord['status'];
	needsReview: boolean;
	createdAt: Date;
	categoryId: string;
	categoryName: string;
	employerId: string;
	employerOrgName: string | null;
	employerOrgType: EmployerProfileRecord['orgType'] | null;
	employerVerificationStatus: EmployerProfileRecord['verificationStatus'] | null;
	employerRatingAvg: number | null;
	employerRatingCount: number | null;
};

/**
 * Accepted applications for the job in the current row.
 *
 * A correlated subquery keeps the projection flat; aggregating in the main query
 * would need a GROUP BY over every job column. `applications_job_status_idx`
 * covers `(jobId, status)`, so each row costs one short index lookup.
 */
function acceptedCountExpression(): SQL<number> {
	return sql<number>`(
		select count(*)::int
		from ${applications}
		where ${applications.jobId} = ${jobs.id}
			and ${applications.status} = 'ACCEPTED'
	)`;
}

/**
 * How many people applied to the job in the current row.
 *
 * Withdrawn applications are not counted, because they no longer appear in the
 * employer's applicant list.
 */
function applicantCountExpression(): SQL<number> {
	return sql<number>`(
		select count(*)::int
		from ${applications}
		where ${applications.jobId} = ${jobs.id}
			and ${applications.status} <> 'WITHDRAWN'
	)`;
}

/**
 * Columns that build the shared job summary.
 *
 * Mappers derive `positionsRemaining` from `acceptedCount`.
 */
export const jobSummarySelection = {
	id: jobs.id,
	title: jobs.title,
	location: jobs.location,
	daysOfWeek: jobs.daysOfWeek,
	startTime: jobs.startTime,
	endTime: jobs.endTime,
	salaryAmount: jobs.salaryAmount,
	salaryType: jobs.salaryType,
	startDate: jobs.startDate,
	endDate: jobs.endDate,
	positionsNeeded: jobs.positionsNeeded,
	acceptedCount: acceptedCountExpression(),
	status: jobs.status,
	needsReview: jobs.needsReview,
	createdAt: jobs.createdAt,
	categoryId: categories.id,
	categoryName: categories.name,
	employerId: jobs.employerId,
	employerOrgName: employerProfiles.orgName,
	employerOrgType: employerProfiles.orgType,
	employerVerificationStatus: employerProfiles.verificationStatus,
	employerRatingAvg: employerProfiles.ratingAvg,
	employerRatingCount: employerProfiles.ratingCount
};

/**
 * The summary plus the fields only the owning employer sees.
 *
 * `applicantCount` ignores withdrawn applications, because the employer's
 * applicant list excludes them.
 */
export const myJobSelection = {
	...jobSummarySelection,
	applicantCount: applicantCountExpression(),
	isHidden: jobs.isHidden,
	hiddenReason: jobs.hiddenReason
};

/** The summary plus the long-form fields returned by the job detail endpoint. */
export const jobDetailSelection = {
	...jobSummarySelection,
	description: jobs.description,
	scheduleNote: jobs.scheduleNote,
	isHidden: jobs.isHidden
};

export type MyJobRecord = JobSummaryRecord & {
	applicantCount: number;
	isHidden: boolean;
	hiddenReason: string | null;
};

export type JobDetailRecord = JobSummaryRecord & {
	description: string;
	scheduleNote: string | null;
	isHidden: boolean;
};

export type MyJobListOptions = {
	employerId: string;
	status?: JobRecord['status'];
	limit: number;
	offset: number;
};

export type MyJobPage = {
	items: MyJobRecord[];
	total: number;
};

export type JobSortOrder = 'newest' | 'salary_desc';

export type JobSearchFilters = {
	query?: string;
	categoryId?: string;
	location?: string;
	daysOfWeek?: DayOfWeek[];
	timeOfDay?: TimeOfDay[];
	salaryMin?: number;
	salaryMax?: number;
	startFrom?: string;
	endTo?: string;
	verifiedOnly: boolean;
	sort: JobSortOrder;
	limit: number;
	offset: number;
};

export type JobPage = {
	items: JobSummaryRecord[];
	total: number;
};
