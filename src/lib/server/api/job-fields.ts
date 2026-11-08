import { z } from 'zod';
import { CLOCK_TIME_PATTERN, DAY_OF_WEEK_VALUES } from '#lib/schedule.ts';

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
	daysOfWeek: z.array(z.enum(DAY_OF_WEEK_VALUES)).min(1).max(7),
	startTime: z.string().regex(CLOCK_TIME_PATTERN, 'Use HH:MM, for example 08:00.'),
	endTime: z.string().regex(CLOCK_TIME_PATTERN, 'Use HH:MM, for example 17:00.'),
	scheduleNote: z.string().trim().max(300).nullable().optional(),
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

/**
 * True when the shift ends after it starts on the same day.
 *
 * Overnight shifts are not supported yet, so a missing side passes here for the
 * same reason as `hasOrderedDates`: the service checks an update against the
 * stored other bound.
 */
export function hasOrderedTimes(job: { startTime?: string; endTime?: string }): boolean {
	return job.startTime === undefined || job.endTime === undefined || job.endTime > job.startTime;
}
