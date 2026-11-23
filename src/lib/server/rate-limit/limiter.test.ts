import { describe, expect, it } from 'vitest';
import { createLimiter, type RateLimitStore } from './limiter.ts';

/** An in-memory store so the decision logic is tested without Redis. */
function createCountingStore(): RateLimitStore {
	const counts = new Map<string, number>();

	return {
		async increment(key) {
			const next = (counts.get(key) ?? 0) + 1;
			counts.set(key, next);

			return next;
		}
	};
}

describe('createLimiter', () => {
	it('allows up to the limit and blocks the next request', async () => {
		const limiter = createLimiter({ limit: 3, windowSeconds: 1 }, createCountingStore());
		const now = 1_700_000_000_000;

		expect((await limiter.check('203.0.113.1', now)).allowed).toBe(true);
		expect((await limiter.check('203.0.113.1', now)).allowed).toBe(true);
		expect((await limiter.check('203.0.113.1', now)).allowed).toBe(true);

		const blocked = await limiter.check('203.0.113.1', now);

		expect(blocked.allowed).toBe(false);
		expect(blocked.remaining).toBe(0);
	});

	it('reports the remaining budget', async () => {
		const limiter = createLimiter({ limit: 5, windowSeconds: 1 }, createCountingStore());
		const now = 1_700_000_000_000;

		expect((await limiter.check('ip', now)).remaining).toBe(4);
		expect((await limiter.check('ip', now)).remaining).toBe(3);
	});

	it('keeps identifiers in separate buckets', async () => {
		const limiter = createLimiter({ limit: 1, windowSeconds: 1 }, createCountingStore());
		const now = 1_700_000_000_000;

		expect((await limiter.check('a', now)).allowed).toBe(true);
		expect((await limiter.check('b', now)).allowed).toBe(true);
		expect((await limiter.check('a', now)).allowed).toBe(false);
	});

	it('resets when the window rolls over', async () => {
		const limiter = createLimiter({ limit: 1, windowSeconds: 1 }, createCountingStore());
		const start = 1_700_000_000_000;

		expect((await limiter.check('ip', start)).allowed).toBe(true);
		expect((await limiter.check('ip', start + 1_000)).allowed).toBe(true);
	});

	it('reports seconds until the window resets', async () => {
		const limiter = createLimiter({ limit: 10, windowSeconds: 60 }, createCountingStore());

		// Align to a real 60-second boundary, because the limiter floors `now`.
		const windowStart = Math.ceil(1_700_000_000_000 / 60_000) * 60_000;

		// Half a window in, half a window remains.
		expect((await limiter.check('ip', windowStart + 30_000)).retryAfterSeconds).toBe(30);

		// At the very end, it never reports zero.
		expect((await limiter.check('ip', windowStart + 59_999)).retryAfterSeconds).toBe(1);
	});
});
