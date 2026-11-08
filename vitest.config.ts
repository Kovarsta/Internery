import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			// SvelteKit generates this module; Vitest needs a plain file instead.
			'$app/env/private': fileURLToPath(new URL('./vitest.env-private.ts', import.meta.url))
		}
	},
	test: {
		environment: 'node',
		globalSetup: './vitest.global-setup.ts',
		include: ['src/**/*.test.ts']
	}
});
