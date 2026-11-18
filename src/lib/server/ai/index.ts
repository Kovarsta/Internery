/**
 * The configured AI provider.
 *
 * The key is read from `$app/env/private`, so importing this module from
 * client code fails at build time. `createDeepSeekProvider` waits for the
 * first call before checking the key, which lets the app run without an AI
 * account.
 */
import { DEEPSEEK_API_KEY, DEEPSEEK_MODEL } from '$app/env/private';
import { createDeepSeekProvider } from './deepseek.ts';
import type { AiProvider } from './provider.ts';

let configuredProvider: AiProvider | null = null;

/** Returns the shared DeepSeek client. */
export function getAiProvider(): AiProvider {
	configuredProvider ??= createDeepSeekProvider({
		apiKey: DEEPSEEK_API_KEY,
		model: DEEPSEEK_MODEL
	});

	return configuredProvider;
}
