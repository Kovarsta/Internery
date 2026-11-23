/**
 * A fixed-window rate limiter.
 *
 * One counter per identifier per time window. The window is aligned to the
 * clock (`floor(now / windowMs)`), so every caller in the same second shares a
 * bucket and `retry-after` is a real number rather than a guess.
 *
 * The store is injected so the decision logic is testable without Redis. A
 * fixed window can allow a burst of up to `2 × limit` around a boundary; that
 * is acceptable for a safety ceiling and costs one Redis round trip instead of
 * a sorted set.
 */

/** Counts requests for one key inside one window. */
export type RateLimitStore = {
	/**
	 * Adds one to the counter and returns the new value.
	 *
	 * The store must set the expiry on first use, so a key that is never hit
	 * again disappears on its own.
	 */
	increment(key: string, windowMs: number): Promise<number>;
};

/** What one request may do, and what to tell the client. */
export type RateLimitDecision = {
	allowed: boolean;
	/** Requests allowed per window. */
	limit: number;
	/** Requests left in the current window, never negative. */
	remaining: number;
	/** Seconds until the window resets; at least 1. */
	retryAfterSeconds: number;
};

/** Settings for one limiter. */
export type RateLimitConfig = {
	/** Requests allowed per window. */
	limit: number;
	/** Window length in seconds. */
	windowSeconds: number;
};

/** Creates a limiter over a store. */
export function createLimiter(config: RateLimitConfig, store: RateLimitStore) {
	const windowMs = config.windowSeconds * 1000;

	return {
		/**
		 * Counts one request for `identifier`.
		 *
		 * `now` is injectable so tests can pin the clock at a window boundary.
		 */
		async check(identifier: string, now: number = Date.now()): Promise<RateLimitDecision> {
			const windowStart = Math.floor(now / windowMs) * windowMs;
			const key = `${identifier}:${windowStart}`;
			const count = await store.increment(key, windowMs);

			return {
				allowed: count <= config.limit,
				limit: config.limit,
				remaining: Math.max(config.limit - count, 0),
				retryAfterSeconds: Math.max(Math.ceil((windowStart + windowMs - now) / 1000), 1)
			};
		}
	};
}
