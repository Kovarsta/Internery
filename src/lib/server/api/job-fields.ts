import { z } from 'zod';

/**
 * The contract's `JobFields`, shared by create and update so the two routes
 * cannot drift.
 *
 * `POST /jobs` requires every field. `PATCH /jobs/{jobId}` calls `.partial()` so
 * the caller can send only what changes.
 */
export const jobFields = {
	title: z.string().trim().min(1).max(200),
	categoryId: z.uuid(),
	description: z.string().trim().min(1),
	location: z.string().trim().min(1).max(300),
	schedule: z.string().trim().min(1),
	salaryAmount: z.number().int().positive(),
	salaryType: z.enum(['HOURLY', 'DAILY', 'FIXED']),
	startDate: z.iso.date(),
	endDate: z.iso.date(),
	positionsNeeded: z.number().int().min(1)
};

/**
 * True when the date range is ordered.
 *
 * A missing side passes here: on create both fields are required by `jobFields`,
 * and on update the service checks the range against the stored other bound.
 */
export function hasOrderedDates(job: { startDate?: string; endDate?: string }): boolean {
	return job.startDate === undefined || job.endDate === undefined || job.endDate > job.startDate;
}
