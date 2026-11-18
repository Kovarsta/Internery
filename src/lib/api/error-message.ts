type ApiErrorBody = {
	error: {
		code: string;
		message: string;
	};
};

/** The parts of the API error envelope a page may react to. */
export type ApiErrorInfo = {
	/** Stable code from the contract, or null when the body was not JSON. */
	code: string | null;
	/** Human-readable message, safe to show. */
	message: string;
};

/**
 * Reads the code and message from the API error envelope.
 *
 * Callers that branch on the code (`AI_CONSENT_REQUIRED` versus `CV_UNREADABLE`,
 * for example) need both. Callers that only show a message can keep using
 * `readErrorMessage`.
 */
export async function readApiError(response: Response): Promise<ApiErrorInfo> {
	try {
		const body = (await response.json()) as ApiErrorBody;

		return { code: body.error.code, message: body.error.message };
	} catch {
		return { code: null, message: 'The API request failed.' };
	}
}

/** Reads the message from the API error envelope, falling back when the body is not JSON. */
export async function readErrorMessage(response: Response): Promise<string> {
	return (await readApiError(response)).message;
}
