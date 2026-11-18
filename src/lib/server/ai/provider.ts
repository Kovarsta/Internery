/**
 * The AI boundary.
 *
 * Services depend on this interface, never on a vendor SDK. The DeepSeek
 * implementation lives in `deepseek.ts`; tests and local development use
 * `fake.ts`.
 *
 * A provider receives only redacted CV text and public job details. It never
 * receives a database handle, so it cannot look up anything on its own.
 */

/**
 * How long a provider call may take before the caller cancels it (AC-36.3).
 *
 * Services enforce it with `AbortSignal.timeout(AI_TIMEOUT_MS)`:
 * https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
 */
export const AI_TIMEOUT_MS = 15_000;

/** The verdict the contract allows for a CV-to-job comparison. */
export type AiVerdict = 'FIT' | 'MAYBE_FIT';

/** One reason, with the CV text that supports it. */
export type AiReason = {
	text: string;
	cvQuote: string;
};

/** The part of a job the model may see. */
export type AiJobContext = {
	id: string;
	title: string;
	description: string;
	categoryName: string;
	location: string;
	daysOfWeek: string[];
	startTime: string;
	endTime: string;
	salaryAmount: number;
	salaryType: string;
};

/** The student details used for suggestions. The CV is never part of this. */
export type AiStudentContext = {
	major: string;
	skills: string[];
	availability: string | null;
};

/** A request to explain how well a CV fits one job. */
export type AiFitRequest = {
	cvText: string;
	job: AiJobContext;
};

/** A checked explanation from the provider. */
export type AiFitAnswer = {
	verdict: AiVerdict;
	reasons: AiReason[];
	gaps: string[];
	model: string;
};

/** A request to order a pre-filtered list of jobs for one student. */
export type AiSuggestionRequest = {
	student: AiStudentContext;
	jobs: AiJobContext[];
};

/** The provider's ordering. Unknown or invented ids are removed by the service. */
export type AiSuggestionAnswer = {
	rankedJobIds: string[];
	model: string;
};

/** A vendor-neutral AI client. */
export interface AiProvider {
	/** Identifier stored with a cached explanation, e.g. `deepseek-flash`. */
	readonly model: string;

	/**
	 * Compares redacted CV text with one job.
	 *
	 * The caller owns the timeout: pass a signal that aborts after
	 * `AI_TIMEOUT_MS`. The provider rejects with `AiProviderError`.
	 */
	explainFit(request: AiFitRequest, signal: AbortSignal): Promise<AiFitAnswer>;

	/**
	 * Orders at most a handful of pre-filtered jobs, best first.
	 *
	 * The provider may return fewer ids or none. It must not invent ids; the
	 * service drops any id outside the candidate list anyway.
	 */
	rankJobs(request: AiSuggestionRequest, signal: AbortSignal): Promise<AiSuggestionAnswer>;
}

/** What went wrong at the provider, for logging and for fallback decisions. */
export type AiProviderFailure =
	'not-configured' | 'http' | 'network' | 'timeout' | 'invalid-response';

/**
 * A provider failure.
 *
 * Services treat this as an infrastructure error: suggestions fall back to the
 * local ranking and fit reports that the explanation is unavailable. The
 * message is for logs; it never reaches the client.
 */
export class AiProviderError extends Error {
	readonly failure: AiProviderFailure;

	constructor(failure: AiProviderFailure, message: string) {
		super(message);
		this.name = 'AiProviderError';
		this.failure = failure;
	}
}
