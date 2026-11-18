import type { RequestHandler } from './$types';
import { getAiProvider } from '#lib/server/ai/index.ts';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toJobSummary } from '#lib/server/api/mappers.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { db } from '#lib/server/db/index.ts';
import { getJobSuggestions } from '#lib/server/services/ai.ts';

/**
 * GET /me/ai/suggestions - getAiSuggestions
 *
 * The service returns database job rows; the contract exposes the public
 * `JobSummary` shape, so each candidate goes through `toJobSummary`.
 */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['STUDENT']);
		const suggestions = await getJobSuggestions(db, getAiProvider(), user.id);

		return noStoreJson({
			source: suggestions.source,
			notice: suggestions.notice,
			items: suggestions.items.map((item) => ({
				job: toJobSummary(item.job),
				verdict: item.verdict
			}))
		});
	} catch (error) {
		return handleApiError(error);
	}
};
