/**
 * Stable error codes from the API contract.
 *
 * `INTERNAL_ERROR` and `NOT_IMPLEMENTED` are internal scaffolding codes. They
 * are not part of the public contract yet.
 */
export type ErrorCode =
	| 'UNAUTHENTICATED'
	| 'INVALID_CREDENTIALS'
	| 'EMAIL_NOT_VERIFIED'
	| 'ACCOUNT_LOCKED'
	| 'TOO_MANY_ATTEMPTS'
	| 'FORBIDDEN'
	| 'NOT_FOUND'
	| 'VALIDATION_ERROR'
	| 'TOKEN_INVALID'
	| 'EMAIL_TAKEN'
	| 'ALREADY_APPLIED'
	| 'JOB_NOT_HIRING'
	| 'POSITIONS_FULL'
	| 'INVALID_STATE_TRANSITION'
	| 'JOB_HAS_ACCEPTED_APPLICANTS'
	| 'JOB_NOT_COMPLETED'
	| 'NOT_A_PARTICIPANT'
	| 'ALREADY_REVIEWED'
	| 'ALREADY_REPORTED'
	| 'VERIFICATION_PENDING'
	| 'CATEGORY_IN_USE'
	| 'NAME_TAKEN'
	| 'FILE_TOO_LARGE'
	| 'INVALID_FILE_TYPE'
	| 'PROFILE_INCOMPLETE'
	| 'AI_CONSENT_REQUIRED'
	| 'AI_RATE_LIMITED'
	| 'CV_UNREADABLE'
	| 'RATE_LIMITED'
	| 'INTERNAL_ERROR'
	| 'NOT_IMPLEMENTED';

/** Error codes that service functions may throw. */
export type DomainErrorCode =
	| 'VALIDATION_ERROR'
	| 'NOT_FOUND'
	| 'FORBIDDEN'
	| 'INVALID_STATE_TRANSITION'
	| 'JOB_NOT_HIRING'
	| 'POSITIONS_FULL'
	| 'JOB_NOT_COMPLETED'
	| 'NOT_A_PARTICIPANT'
	| 'ALREADY_REVIEWED'
	| 'ALREADY_REPORTED'
	| 'ALREADY_APPLIED'
	| 'JOB_HAS_ACCEPTED_APPLICANTS'
	| 'VERIFICATION_PENDING'
	| 'CATEGORY_IN_USE'
	| 'NAME_TAKEN';

export type ValidationDetail = {
	field: string;
	message: string;
};

export type ErrorResponse = {
	error: {
		code: ErrorCode;
		message: string;
		details?: ValidationDetail[];
		requestId: string;
	};
};

const STATUS_BY_CODE: Record<ErrorCode, number> = {
	UNAUTHENTICATED: 401,
	INVALID_CREDENTIALS: 401,
	EMAIL_NOT_VERIFIED: 403,
	ACCOUNT_LOCKED: 403,
	TOO_MANY_ATTEMPTS: 429,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	VALIDATION_ERROR: 422,
	TOKEN_INVALID: 422,
	EMAIL_TAKEN: 409,
	ALREADY_APPLIED: 409,
	JOB_NOT_HIRING: 409,
	POSITIONS_FULL: 409,
	INVALID_STATE_TRANSITION: 409,
	JOB_HAS_ACCEPTED_APPLICANTS: 409,
	JOB_NOT_COMPLETED: 409,
	NOT_A_PARTICIPANT: 409,
	ALREADY_REVIEWED: 409,
	ALREADY_REPORTED: 409,
	VERIFICATION_PENDING: 409,
	CATEGORY_IN_USE: 409,
	NAME_TAKEN: 409,
	FILE_TOO_LARGE: 413,
	INVALID_FILE_TYPE: 415,
	PROFILE_INCOMPLETE: 422,
	AI_CONSENT_REQUIRED: 403,
	AI_RATE_LIMITED: 429,
	CV_UNREADABLE: 422,
	RATE_LIMITED: 429,
	INTERNAL_ERROR: 500,
	NOT_IMPLEMENTED: 501
};

const DEFAULT_MESSAGES: Partial<Record<ErrorCode, string>> = {
	UNAUTHENTICATED: 'You must sign in to do that.',
	FORBIDDEN: 'You do not have permission to do that.',
	NOT_FOUND: 'The requested resource was not found.',
	VALIDATION_ERROR: 'Request validation failed.',
	ACCOUNT_LOCKED: 'This account is locked.',
	POSITIONS_FULL: 'All positions for this job are filled.',
	JOB_NOT_HIRING: 'This job is no longer hiring.',
	JOB_NOT_COMPLETED: 'The job must be completed before it can be reviewed.',
	INVALID_STATE_TRANSITION: 'The resource is not in a valid state for this action.',
	JOB_HAS_ACCEPTED_APPLICANTS: 'This job has accepted applicants and cannot be deleted.',
	NOT_A_PARTICIPANT: 'You are not a participant in this job.',
	ALREADY_APPLIED: 'You have already applied to this job.',
	ALREADY_REVIEWED: 'You have already reviewed this person for this job.',
	ALREADY_REPORTED: 'You have already reported this job.',
	VERIFICATION_PENDING: 'A verification request is already pending.',
	CATEGORY_IN_USE: 'This category is used by at least one job.',
	NAME_TAKEN: 'That name is already in use.'
};

/** An error that maps directly to an API response. */
export class ApiError extends Error {
	readonly code: ErrorCode;
	readonly details?: ValidationDetail[];

	constructor(code: ErrorCode, message = defaultMessage(code), details?: ValidationDetail[]) {
		super(message);
		this.name = 'ApiError';
		this.code = code;
		this.details = details;
	}
}

/** An error thrown by a service when a business rule fails. */
export class DomainError extends Error {
	readonly code: DomainErrorCode;
	readonly details?: ValidationDetail[];

	constructor(code: DomainErrorCode, message = defaultMessage(code), details?: ValidationDetail[]) {
		super(message);
		this.name = 'DomainError';
		this.code = code;
		this.details = details;
	}
}

export function statusForErrorCode(code: ErrorCode): number {
	return STATUS_BY_CODE[code];
}

/**
 * Converts a thrown value into the standard API error response.
 *
 * Unknown errors are logged with a request id and returned as a generic 500 so
 * database messages and stack traces never reach the client.
 */
export function handleApiError(error: unknown): Response {
	const requestId = crypto.randomUUID();

	if (error instanceof ApiError) {
		return createErrorResponse(error.code, error.message, error.details, requestId);
	}

	if (error instanceof DomainError) {
		return createErrorResponse(error.code, error.message, error.details, requestId);
	}

	console.error(`[api:${requestId}]`, error);

	return createErrorResponse(
		'INTERNAL_ERROR',
		'An unexpected error occurred.',
		undefined,
		requestId
	);
}

function createErrorResponse(
	code: ErrorCode,
	message: string,
	details: ValidationDetail[] | undefined,
	requestId: string
): Response {
	const body: ErrorResponse = {
		error: {
			code,
			message,
			requestId
		}
	};

	if (details !== undefined) {
		body.error.details = details;
	}

	return Response.json(body, { status: statusForErrorCode(code) });
}

function defaultMessage(code: ErrorCode): string {
	return DEFAULT_MESSAGES[code] ?? code;
}
