type ApiErrorBody = {
	error: {
		code: string;
		message: string;
	};
};

/** Reads the message from the API error envelope, falling back when the body is not JSON. */
export async function readErrorMessage(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as ApiErrorBody;

		return body.error.message;
	} catch {
		return 'The API request failed.';
	}
}
