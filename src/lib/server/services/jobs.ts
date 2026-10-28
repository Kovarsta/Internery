import { sql } from 'drizzle-orm';
import { applications, categories, employerProfiles, jobs } from '#lib/server/db/product.schema.ts';

type JobRecord = typeof jobs.$inferSelect;
type EmployerProfileRecord = typeof employerProfiles.$inferSelect;

export type JobSummaryRecord = {
	id: string;
	title: string;
	location: string;
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
 * Columns that build the shared job summary.
 *
 * `acceptedCount` is a correlated subquery so the projection does not need a
 * GROUP BY over every job column. Mappers derive `positionsRemaining` from it.
 */
export const jobSummarySelection = {
	id: jobs.id,
	title: jobs.title,
	location: jobs.location,
	salaryAmount: jobs.salaryAmount,
	salaryType: jobs.salaryType,
	startDate: jobs.startDate,
	endDate: jobs.endDate,
	positionsNeeded: jobs.positionsNeeded,
	acceptedCount: sql<number>`(
		select count(*)::int
		from ${applications}
		where ${applications.jobId} = ${jobs.id}
			and ${applications.status} = 'ACCEPTED'
	)`,
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
