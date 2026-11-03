import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toWorkRecord } from '#lib/server/api/mappers.ts';
import { parseJson, parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { setWorkRecordVisibility } from '#lib/server/services/work-records.ts';

const paramsSchema = z.object({
	recordId: z.uuid()
});

const bodySchema = z.object({
	isPublic: z.boolean()
});

/**
 * PATCH /me/work-records/{recordId} - setWorkRecordVisibility
 *
 * Publishing puts the record in the public directory; hiding it removes the
 * record from the directory and stops the verify page returning personal data
 * (AC-45.3). Another student's record answers `404`.
 */
export const PATCH: RequestHandler = async (event) => {
	try {
		const student = requireRole(event.locals, ['STUDENT']);
		const { recordId } = parseParams(event.params, paramsSchema);
		const body = await parseJson(event.request, bodySchema);

		const record = await setWorkRecordVisibility(db, {
			studentId: student.id,
			recordId,
			isPublic: body.isPublic
		});

		return Response.json(toWorkRecord(record, event.url.origin));
	} catch (error) {
		return handleApiError(error);
	}
};
