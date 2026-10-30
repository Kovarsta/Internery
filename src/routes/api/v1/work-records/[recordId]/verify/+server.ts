import type { RequestHandler } from './$types';
import { z } from 'zod';
import { WORK_RECORD_SECRET } from '$app/env/private';
import { ApiError, handleApiError } from '#lib/server/api/errors.ts';
import { toWorkRecordCard } from '#lib/server/api/mappers.ts';
import { parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { findPublicWorkRecord } from '#lib/server/services/work-records.ts';
import { verifyWorkRecordSignature } from '#lib/server/work-record-signature.ts';

const paramsSchema = z.object({
	recordId: z.uuid()
});

/** GET /work-records/{recordId}/verify — verifyWorkRecord */
export const GET: RequestHandler = async (event) => {
	try {
		// Fail closed before touching the database: without the key no stored
		// signature can be checked, so a missing secret is a deployment fault.
		if (!WORK_RECORD_SECRET) {
			throw new ApiError('INTERNAL_ERROR', 'Work-record signing is not configured.');
		}

		const { recordId } = parseParams(event.params, paramsSchema);
		const record = await findPublicWorkRecord(db, recordId);

		// Private and unknown ids share one response, so the endpoint cannot be
		// used to discover which records exist (AC-45.3).
		if (!record) {
			throw new ApiError('NOT_FOUND');
		}

		const valid = verifyWorkRecordSignature(
			record.payload,
			record.signature,
			WORK_RECORD_SECRET,
			record.signatureVersion
		);

		// A tampered payload must not be echoed back as if it were trustworthy.
		return Response.json({
			valid,
			record: valid ? toWorkRecordCard(record) : null
		});
	} catch (error) {
		return handleApiError(error);
	}
};
