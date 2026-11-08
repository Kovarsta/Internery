/**
 * Stand-in for SvelteKit's generated `$app/env/private` during unit tests.
 *
 * Vitest does not run the SvelteKit plugin that generates the real module.
 * Values are read from the environment when present, so a test can override
 * them, and fall back to safe placeholders.
 */
export const DATABASE_URL = process.env.DATABASE_URL ?? '';
export const ORIGIN = process.env.ORIGIN ?? 'http://localhost:3000';
export const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? 'test-secret';
export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? '';
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? '';
export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
export const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? 'Internery <test@example.com>';
export const WORK_RECORD_SECRET = process.env.WORK_RECORD_SECRET ?? 'test-secret';
export const S3_ENDPOINT = process.env.S3_ENDPOINT ?? '';
export const S3_REGION = process.env.S3_REGION ?? '';
export const S3_BUCKET = process.env.S3_BUCKET ?? '';
export const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID ?? '';
export const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY ?? '';
