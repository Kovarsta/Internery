/**
 * CV fit explanations (US-37, US-38).
 *
 * The flow is deliberately ordered so nothing private leaves the server before
 * the student's consent is checked:
 *
 * 1. Load the visible job and the student's active consent.
 * 2. Read the stored CV, extract its text, and remove name, phone and email.
 * 3. Return a cached explanation for the same (student, job, CV hash) if one
 *    exists; a cache hit does not spend a daily call.
 * 4. Reserve one daily call, ask the provider, and verify every quote against
 *    the CV before storing the answer.
 *
 * A provider failure releases the reserved call and escapes as an unexpected
 * error. Fit cannot honestly fall back to a made-up verdict, so the client
 * shows "try again" and the student keeps the attempt.
 */
import { and, eq } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import type { Database } from '#lib/server/db/types.ts';
import { users } from '#lib/server/db/auth.schema.ts';
import { aiExplanations, userProfiles } from '#lib/server/db/product.schema.ts';
import {
	AI_TIMEOUT_MS,
	type AiProvider,
	type AiReason,
	type AiVerdict
} from '#lib/server/ai/provider.ts';
import {
	CvUnreadableError,
	extractCvText,
	hashCvText,
	limitCvText,
	normaliseCvText,
	quoteAppearsInCv
} from '#lib/server/ai/cv-text.ts';
import { redactCvText, type CvIdentity } from '#lib/server/ai/redaction.ts';
import type { Storage } from '#lib/server/storage/client.ts';
import { getOwnCv } from '#lib/server/services/cv.ts';
import { findJobDetail } from '#lib/server/services/jobs/index.ts';
import { hasActiveAiConsent } from './consent.ts';
import { toAiJobContext } from './context.ts';
import { releaseAiCall, reserveAiCall } from './usage.ts';

/** What the API returns for `GET /jobs/{jobId}/ai/fit`. */
export type JobFit = {
	verdict: AiVerdict;
	reasons: AiReason[];
	gaps: string[];
	cached: boolean;
	model: string;
};

/** The student and job the explanation is for. */
export type JobFitRequest = {
	studentId: string;
	jobId: string;
};

/**
 * Explains how the student's CV fits one job.
 *
 * Throws `DomainError` with `NOT_FOUND` for a missing or hidden job,
 * `AI_CONSENT_REQUIRED` without active consent, `CV_UNREADABLE` when there is
 * no readable CV, and `AI_RATE_LIMITED` when today's calls are spent.
 */
export async function getJobFit(
	database: Database,
	provider: AiProvider,
	storage: Storage,
	request: JobFitRequest
): Promise<JobFit> {
	const job = await findJobDetail(database, request.jobId);

	if (!job || job.isHidden) {
		throw new DomainError('NOT_FOUND');
	}

	if (!(await hasActiveAiConsent(database, request.studentId))) {
		throw new DomainError('AI_CONSENT_REQUIRED');
	}

	const identity = await loadCvIdentity(database, request.studentId);
	const cvText = await readRedactedCv(database, storage, request.studentId, identity);
	const cvHash = hashCvText(cvText);

	const cached = await findCachedFit(database, request.studentId, request.jobId, cvHash);

	if (cached) {
		return toJobFit(cached, true);
	}

	const reservation = await reserveAiCall(database, request.studentId);

	if (!reservation) {
		throw new DomainError('AI_RATE_LIMITED');
	}

	let answer;

	try {
		answer = await provider.explainFit(
			{ cvText, job: toAiJobContext(job) },
			AbortSignal.timeout(AI_TIMEOUT_MS)
		);
	} catch (error) {
		// The provider was never reached or produced nothing usable, so the
		// student should not lose one of today's calls.
		await releaseAiCall(database, request.studentId, reservation);

		console.error('[ai:fit]', error);

		throw error;
	}

	// AC-37.2: a reason survives only when its quote really appears in the CV.
	const reasons = answer.reasons.filter((reason) => quoteAppearsInCv(reason.cvQuote, cvText));
	const gaps = answer.gaps.slice(0, 3);

	await database
		.insert(aiExplanations)
		.values({
			studentId: request.studentId,
			jobId: request.jobId,
			cvHash,
			verdict: answer.verdict,
			reasons,
			gaps,
			model: answer.model
		})
		// Two requests for the same CV and job can race; the first stored
		// answer wins and both callers get a usable result.
		.onConflictDoNothing();

	return {
		verdict: answer.verdict,
		reasons,
		gaps,
		cached: false,
		model: answer.model
	};
}

/** Reads the student's name, email and phone for the redaction step. */
async function loadCvIdentity(database: Database, studentId: string): Promise<CvIdentity> {
	const [row] = await database
		.select({
			fullName: users.name,
			email: users.email,
			phone: userProfiles.phone
		})
		.from(users)
		.leftJoin(userProfiles, eq(userProfiles.userId, users.id))
		.where(eq(users.id, studentId))
		.limit(1);

	if (!row) {
		throw new DomainError('NOT_FOUND');
	}

	return { fullName: row.fullName, email: row.email, phone: row.phone };
}

/**
 * Reads the stored CV and returns the exact text that will be sent.
 *
 * The storage client returns a web stream, not the whole file. `Response`
 * consumes that stream to completion and gives back one `ArrayBuffer`:
 * https://developer.mozilla.org/en-US/docs/Web/API/Response/arrayBuffer
 *
 * The order matters: extract, redact, normalise, then cap. Capping last means
 * a long CV is cut after the name was removed, so a truncation cannot leave
 * half a name behind. The same string is hashed and checked for quotes.
 */
async function readRedactedCv(
	database: Database,
	storage: Storage,
	studentId: string,
	identity: CvIdentity
): Promise<string> {
	const cv = await getOwnCv(database, studentId);

	if (!cv) {
		throw new DomainError('CV_UNREADABLE');
	}

	const object = await storage.getObject(cv.key);

	// The metadata can outlive the object after a failed cleanup.
	if (!object) {
		throw new DomainError('CV_UNREADABLE');
	}

	// `object.body` is a `ReadableStream`, not a buffer. `Response` is the
	// standard consumer that joins its chunks into one `ArrayBuffer`.
	// https://developer.mozilla.org/en-US/docs/Web/API/Response/arrayBuffer
	const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());

	let extracted;

	try {
		extracted = await extractCvText({
			bytes,
			fileName: cv.fileName,
			mimeType: cv.mimeType
		});
	} catch (error) {
		if (error instanceof CvUnreadableError) {
			throw new DomainError('CV_UNREADABLE');
		}

		throw error;
	}

	const redacted = redactCvText(extracted, identity);

	return limitCvText(normaliseCvText(redacted));
}

/** Finds an explanation for the same CV text and job. */
async function findCachedFit(
	database: Database,
	studentId: string,
	jobId: string,
	cvHash: string
): Promise<typeof aiExplanations.$inferSelect | null> {
	const [row] = await database
		.select()
		.from(aiExplanations)
		.where(
			and(
				eq(aiExplanations.studentId, studentId),
				eq(aiExplanations.jobId, jobId),
				eq(aiExplanations.cvHash, cvHash)
			)
		)
		.limit(1);

	return row ?? null;
}

/** Maps a cached row to the API shape. */
function toJobFit(row: typeof aiExplanations.$inferSelect, cached: boolean): JobFit {
	return {
		verdict: row.verdict,
		reasons: row.reasons,
		gaps: row.gaps,
		cached,
		model: row.model
	};
}
