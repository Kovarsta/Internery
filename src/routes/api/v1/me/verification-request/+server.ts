import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { ApiError, handleApiError } from '#lib/server/api/errors.ts';
import { toVerificationRequest } from '#lib/server/api/mappers.ts';
import { noStoreJson } from '#lib/server/api/responses.ts';
import { parseFormData, readLicenseFile } from '#lib/server/api/uploads.ts';
import { parseFormFields } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import {
	findLatestVerificationRequest,
	submitVerificationRequest
} from '#lib/server/services/verification.ts';
import { storage } from '#lib/server/storage/index.ts';

const fieldsSchema = z.object({
	orgName: z.string().trim().min(1).max(200),
	contactInfo: z.string().trim().min(1).max(300),
	websiteUrl: z.string().trim().max(500).optional()
});

/** GET /me/verification-request - getMyVerificationRequest */
export const GET: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const request = await findLatestVerificationRequest(db, user.id);

		if (!request) {
			throw new ApiError('NOT_FOUND');
		}

		return noStoreJson(toVerificationRequest(request));
	} catch (error) {
		return handleApiError(error);
	}
};

/**
 * POST /me/verification-request - submitVerificationRequest
 *
 * Accepts the multipart form the employer fills in. The business licence is
 * optional; when present it is validated by its bytes and stored in the private
 * bucket, so the request row only ever holds the opaque key.
 */
export const POST: RequestHandler = async (event) => {
	try {
		const user = requireRole(event.locals, ['EMPLOYER']);
		const form = await parseFormData(event.request);
		const fields = parseFormFields(form, fieldsSchema);
		const licenseFile = form.get('license');
		const license =
			licenseFile instanceof File && licenseFile.size > 0
				? await readLicenseFile(licenseFile)
				: null;

		const request = await submitVerificationRequest(db, storage, user.id, {
			orgName: fields.orgName,
			websiteUrl: readWebsiteUrl(fields.websiteUrl),
			contactInfo: fields.contactInfo,
			license
		});

		return noStoreJson(toVerificationRequest(request), { status: 201 });
	} catch (error) {
		return handleApiError(error);
	}
};

/**
 * Reads the optional website field.
 *
 * An empty field means "no website", not an invalid one. A value must be a full
 * HTTP or HTTPS URL, because the admin uses it to check the organisation.
 */
function readWebsiteUrl(value: string | undefined): string | null {
	if (value === undefined || value === '') {
		return null;
	}

	const isValid = URL.canParse(value);
	const protocol = isValid ? new URL(value).protocol : '';

	if (!isValid || (protocol !== 'http:' && protocol !== 'https:')) {
		throw new ApiError('VALIDATION_ERROR', 'Request validation failed.', [
			{ field: 'websiteUrl', message: 'Enter a full URL starting with http:// or https://.' }
		]);
	}

	return value;
}
