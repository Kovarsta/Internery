import type { RequestHandler } from './$types';
import { z } from 'zod';
import { getAiProvider } from '#lib/server/ai/index.ts';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { getJobFit } from '#lib/server/services/ai.ts';
import { storage } from '#lib/server/storage/index.ts';

const paramsSchema = z.object({
	jobId: z.uuid()
});

/**
 * GET /jobs/{jobId}/ai/fit - getAiFit
 *
 * The service already returns the contract shape: verdict, verified reasons,
 * gaps, `cached` and the model name. Consent, CV readability and the daily
 * limit are enforced inside `getJobFit` and surface through `handleApiError`.
 */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const { jobId } = parseParams(event.params, paramsSchema);

		const fit = await getJobFit(db, getAiProvider(), storage, {
			studentId: user.id,
			jobId
		});

		return noStoreJson(fit);
	} catch (error) {
		return handleApiError(error);
	}
};
