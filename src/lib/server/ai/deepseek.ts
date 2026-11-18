/**
 * DeepSeek provider over its OpenAI-compatible chat completions API.
 *
 * No vendor SDK is used: one `fetch` call with a JSON body is the whole
 * transport, which keeps the dependency surface small and makes the provider
 * easy to replace. The endpoint is not OpenAI; only the request and response
 * shape are shared.
 *
 * Reference:
 *
 * - Chat completions: https://api-docs.deepseek.com/api/create-chat-completion
 * - JSON output: https://api-docs.deepseek.com/guides/json_mode
 * - Thinking mode: https://api-docs.deepseek.com/guides/thinking_mode
 */
import { z } from 'zod';
import {
	AiProviderError,
	type AiFitAnswer,
	type AiFitRequest,
	type AiProvider,
	type AiSuggestionAnswer,
	type AiSuggestionRequest
} from './provider.ts';
import {
	FIT_SYSTEM_PROMPT,
	SUGGESTION_SYSTEM_PROMPT,
	buildFitUserPrompt,
	buildSuggestionUserPrompt
} from './prompts.ts';

/** DeepSeek's production API endpoint. */
const DEFAULT_BASE_URL = 'https://api.deepseek.com';

/** Settings for one DeepSeek client. */
export type DeepSeekConfig = {
	apiKey: string;
	model: string;
	/** Override for a proxy or a test server. */
	baseUrl?: string;
	/** Override for tests. Defaults to the global `fetch`. */
	fetchImplementation?: typeof fetch;
};

/**
 * The JSON object the fit prompt promises.
 *
 * `.default([])` keeps an omitted list valid: a model that returns only a
 * verdict still produces a usable answer. The service caps the lists and
 * verifies the quotes afterwards.
 */
const FIT_RESPONSE_SCHEMA = z.object({
	verdict: z.enum(['FIT', 'MAYBE_FIT']),
	reasons: z
		.array(
			z.object({
				text: z.string(),
				cvQuote: z.string()
			})
		)
		.default([]),
	gaps: z.array(z.string()).default([])
});

/**
 * The JSON object the suggestion prompt promises.
 *
 * The ids are only a ranking. The service drops unknown ids and re-checks
 * that each chosen job is still open.
 */
const SUGGESTION_RESPONSE_SCHEMA = z.object({
	rankedJobIds: z.array(z.string()).default([])
});

/**
 * Creates a DeepSeek-backed provider.
 *
 * `config.apiKey` is checked on the first call, not at construction, so the
 * app can start without an AI account (the key is an optional environment
 * variable). A missing key is reported as `not-configured`, which suggestions
 * treat as a reason to fall back.
 */
export function createDeepSeekProvider(config: DeepSeekConfig): AiProvider {
	const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
	const fetchImplementation = config.fetchImplementation ?? fetch;

	/**
	 * Sends one chat completion and returns the parsed JSON object.
	 *
	 * `response_format` alone is not enough for DeepSeek: the prompt must also
	 * ask for JSON, which every prompt in `prompts.ts` does.
	 *
	 * When the model fails to produce JSON, DeepSeek replaces the answer with
	 * spaces rather than returning an error, so an empty or unparseable body is
	 * treated as `invalid-response`:
	 * https://api-docs.deepseek.com/guides/json_mode
	 */
	async function completeJson(
		systemPrompt: string,
		userPrompt: string,
		maxTokens: number,
		signal: AbortSignal
	): Promise<unknown> {
		if (config.apiKey.length === 0) {
			throw new AiProviderError(
				'not-configured',
				'DEEPSEEK_API_KEY is empty, so the AI features are disabled.'
			);
		}

		let response: Response;

		try {
			response = await fetchImplementation(`${baseUrl}/chat/completions`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${config.apiKey}`
				},
				body: JSON.stringify({
					model: config.model,
					messages: [
						{ role: 'system', content: systemPrompt },
						{ role: 'user', content: userPrompt }
					],
					response_format: { type: 'json_object' },
					// Classification does not benefit from a reasoning pass, and
					// thinking would add latency to a 15-second budget.
					// https://api-docs.deepseek.com/guides/thinking_mode
					thinking: { type: 'disabled' },
					temperature: 0,
					max_tokens: maxTokens,
					stream: false
				}),
				signal
			});
		} catch (error) {
			throw transportError(error, signal);
		}

		if (!response.ok) {
			const detail = await response.text().catch(() => '');

			throw new AiProviderError(
				'http',
				`DeepSeek returned ${response.status}: ${detail.slice(0, 200)}`
			);
		}

		let payload: unknown;

		try {
			payload = await response.json();
		} catch {
			throw new AiProviderError('invalid-response', 'DeepSeek returned a body that is not JSON.');
		}

		const content = readMessageContent(payload);

		if (content === null) {
			throw new AiProviderError('invalid-response', 'DeepSeek returned no message content.');
		}

		try {
			return JSON.parse(content);
		} catch {
			throw new AiProviderError(
				'invalid-response',
				'DeepSeek message content is not a JSON object.'
			);
		}
	}

	return {
		model: config.model,

		async explainFit(request: AiFitRequest, signal: AbortSignal): Promise<AiFitAnswer> {
			const content = await completeJson(
				FIT_SYSTEM_PROMPT,
				buildFitUserPrompt(request),
				// Four reasons plus gaps comfortably fit; the cap is a guard
				// against a runaway answer, not a quality target.
				900,
				signal
			);

			const parsed = FIT_RESPONSE_SCHEMA.safeParse(content);

			if (!parsed.success) {
				throw new AiProviderError('invalid-response', 'DeepSeek returned an unexpected fit shape.');
			}

			return {
				verdict: parsed.data.verdict,
				reasons: parsed.data.reasons,
				gaps: parsed.data.gaps,
				model: config.model
			};
		},

		async rankJobs(request: AiSuggestionRequest, signal: AbortSignal): Promise<AiSuggestionAnswer> {
			const content = await completeJson(
				SUGGESTION_SYSTEM_PROMPT,
				buildSuggestionUserPrompt(request),
				400,
				signal
			);

			const parsed = SUGGESTION_RESPONSE_SCHEMA.safeParse(content);

			if (!parsed.success) {
				throw new AiProviderError(
					'invalid-response',
					'DeepSeek returned an unexpected suggestion shape.'
				);
			}

			return {
				rankedJobIds: parsed.data.rankedJobIds,
				model: config.model
			};
		}
	};
}

/** Reads `choices[0].message.content` without trusting the payload shape. */
function readMessageContent(payload: unknown): string | null {
	if (typeof payload !== 'object' || payload === null) {
		return null;
	}

	const choices = (payload as { choices?: unknown }).choices;

	if (!Array.isArray(choices) || choices.length === 0) {
		return null;
	}

	const message = (choices[0] as { message?: unknown }).message;

	if (typeof message !== 'object' || message === null) {
		return null;
	}

	const content = (message as { content?: unknown }).content;

	return typeof content === 'string' && content.length > 0 ? content : null;
}

/**
 * Classifies a thrown fetch error.
 *
 * A caller-cancelled request and a timeout both surface as `AbortError`, so
 * the signal decides which one it was. `AbortSignal.timeout` is documented at
 * https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
 */
function transportError(error: unknown, signal: AbortSignal): AiProviderError {
	if (signal.aborted) {
		return new AiProviderError('timeout', 'The AI request was cancelled before it finished.');
	}

	const message = error instanceof Error ? error.message : 'unknown network error';

	return new AiProviderError('network', `The AI request failed: ${message}`);
}
