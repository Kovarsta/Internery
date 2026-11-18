/**
 * A provider that answers without a network call.
 *
 * Tests use it so the suite never reaches DeepSeek. Local development can use
 * it too when no API key is configured but the AI screens need data.
 */
import type { AiProvider } from './provider.ts';

/** Replace one or both answers; anything omitted gets a safe default. */
export type FakeProviderOptions = {
	model?: string;
	explainFit?: AiProvider['explainFit'];
	rankJobs?: AiProvider['rankJobs'];
};

/** A deterministic provider. The default fit answer is an empty `MAYBE_FIT`. */
export function createFakeProvider(options: FakeProviderOptions = {}): AiProvider {
	const model = options.model ?? 'fake-ai';

	return {
		model,

		explainFit:
			options.explainFit ??
			(async () => ({
				verdict: 'MAYBE_FIT' as const,
				reasons: [],
				gaps: [],
				model
			})),

		rankJobs:
			options.rankJobs ??
			(async (request) => ({
				rankedJobIds: request.jobs.slice(0, 5).map((job) => job.id),
				model
			}))
	};
}
