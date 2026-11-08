import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { ApiError, handleApiError } from '#lib/server/api/errors.ts';
import { hasOrderedDates, hasOrderedTimes, jobFields } from '#lib/server/api/job-fields.ts';
import { toApplication, toJobDetail } from '#lib/server/api/mappers.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseJson, parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { findStudentApplicationForJob } from '#lib/server/services/applications.ts';
import {
	deleteJob,
	findJobDetail,
	updateJob,
	type JobDetailRecord
} from '#lib/server/services/jobs.ts';
import { isJobSaved } from '#lib/server/services/saved-jobs.ts';

const paramsSchema = z.object({
	jobId: z.uuid()
});

const updateJobSchema = z
	.object(jobFields)
	.partial()
	.refine((job) => Object.keys(job).length > 0, {
		message: 'Provide at least one field to update.'
	})
	.refine(hasOrderedDates, { path: ['endDate'], message: 'endDate must be after startDate.' })
	.refine(hasOrderedTimes, { path: ['endTime'], message: 'endTime must be after startTime.' });

/** GET /jobs/{jobId} — getJob */
export const GET: RequestHandler = async (event) => {
	try {
		const { jobId } = parseParams(event.params, paramsSchema);
		const viewer = event.locals.user;

		const job = await findJobDetail(db, jobId);

		if (!job || !canViewJob(job, viewer)) {
			throw new ApiError('NOT_FOUND');
		}

		const studentDetails = await loadStudentDetails(job.id, viewer);

		return noStoreJson(toJobDetail(job, studentDetails));
	} catch (error) {
		return handleApiError(error);
	}
};

/** PATCH /jobs/{jobId} — updateJob */
export const PATCH: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const { jobId } = parseParams(event.params, paramsSchema);
		const body = await parseJson(event.request, updateJobSchema);

		const job = await updateJob(db, user.id, jobId, body);

		return Response.json(toJobDetail(job, null));
	} catch (error) {
		return handleApiError(error);
	}
};

/** DELETE /jobs/{jobId} — deleteJob */
export const DELETE: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const { jobId } = parseParams(event.params, paramsSchema);

		await deleteJob(db, user.id, jobId);

		return new Response(null, { status: 204 });
	} catch (error) {
		return handleApiError(error);
	}
};

/**
 * Hidden jobs are only visible to their owner and admins (AC-11.2, FR-50).
 *
 * Everyone else gets `404`, not `403`, so the job's existence is not leaked.
 */
function canViewJob(job: JobDetailRecord, viewer: App.Locals['user']): boolean {
	if (!job.isHidden) {
		return true;
	}

	if (!viewer) {
		return false;
	}

	return viewer.id === job.employerId || viewer.role === 'ADMIN';
}

/** Loads the student-only extras for a job detail response. */
async function loadStudentDetails(jobId: string, viewer: App.Locals['user']) {
	if (viewer?.role !== 'STUDENT') {
		return null;
	}

	// Two extra reads, skipped for anonymous visitors and other roles.
	const [saved, application] = await Promise.all([
		isJobSaved(db, viewer.id, jobId),
		findStudentApplicationForJob(db, viewer.id, jobId)
	]);

	return {
		saved,
		myApplication: application === null ? null : toApplication(application)
	};
}
