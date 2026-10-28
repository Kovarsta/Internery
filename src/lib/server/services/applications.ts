import { and, count, desc, eq } from 'drizzle-orm';
import type { Database } from '#lib/server/db/types.ts';
import { users } from '#lib/server/db/auth.schema.ts';
import { applications, employerProfiles, jobs } from '#lib/server/db/product.schema.ts';

type ApplicationRecord = typeof applications.$inferSelect;

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

/** Returns one page of a student's applications, newest first. */
export async function listMyApplications(
	database: Database,
	options: ApplicationListOptions
): Promise<ApplicationPage> {
	const filters = and(
		eq(applications.studentId, options.studentId),
		options.status === undefined ? undefined : eq(applications.status, options.status)
	);

	const [items, totalRows] = await Promise.all([
		database
			.select({
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
			})
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
