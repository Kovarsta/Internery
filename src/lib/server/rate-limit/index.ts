/**
 * The configured rate limiter.
 *
 * Fails open: if Redis is unreachable or slow, `check` returns null and the
 * request is allowed. A demo that loses its limiter should keep serving, and it
 * must not make every request wait on a dead connection, so the check is capped
 * at `CHECK_TIMEOUT_MS`. The failure is logged once a minute instead of on
 * every request.
 */
import { RATE_LIMIT_PER_SECOND, REDIS_URL } from '$app/env/private';
import { createLimiter, type RateLimitDecision, type RateLimitStore } from './limiter.ts';
import { createRedisStore } from './redis.ts';

/**
 * The Redis store, kept across Vite module reloads for the same reason as the
 * database pool: a reload would otherwise build a new client and leave the old
 * connection open. The store still connects lazily, so starting the app does
 * not touch Redis.
 */
const globalForRateLimit = globalThis as typeof globalThis & {
	interneryRateLimitStore?: RateLimitStore;
};

const store = globalForRateLimit.interneryRateLimitStore ?? createRedisStore(REDIS_URL);

globalForRateLimit.interneryRateLimitStore = store;

const limiter = createLimiter({ limit: RATE_LIMIT_PER_SECOND, windowSeconds: 1 }, store);

/** Longest a Redis check may take before the request is allowed without it. */
const CHECK_TIMEOUT_MS = 500;

/** How long to wait before logging the same Redis failure again. */
const FAILURE_LOG_INTERVAL_MS = 60_000;

let lastFailureLoggedAt = 0;

/**
 * Counts one request for `identifier`.
 *
 * Returns null when the store failed or was too slow, which the caller treats
 * as “allow” but without rate-limit headers, because there is no trustworthy
 * count.
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitDecision | null> {
	try {
		const decision = await withTimeout(limiter.check(identifier), CHECK_TIMEOUT_MS);

		if (decision === null) {
			logFailure(new Error(`The rate limit check took longer than ${CHECK_TIMEOUT_MS} ms.`));
		}

		return decision;
	} catch (error) {
		logFailure(error);

		return null;
	}
}

/**
 * Resolves with `null` when `promise` does not settle in time.
 *
 * The underlying Redis call is left to finish; the request is not kept waiting
 * for a store that is down.
 */
function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T | null> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => resolve(null), milliseconds);

		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error: unknown) => {
				clearTimeout(timer);
				reject(error);
			}
		);
	});
}

/** Logs a Redis failure at most once per interval. */
function logFailure(error: unknown): void {
	const now = Date.now();

	if (now - lastFailureLoggedAt < FAILURE_LOG_INTERVAL_MS) {
		return;
	}

	lastFailureLoggedAt = now;
	console.error('[rate-limit] Redis check failed; allowing requests.', error);
}
