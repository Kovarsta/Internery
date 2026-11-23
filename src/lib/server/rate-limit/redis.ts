/**
 * Redis-backed counter for the rate limiter.
 *
 * One Lua script does the increment and the first-use expiry together, so two
 * requests cannot both see "1" or leave a key without a TTL. The connection is
 * created lazily on the first check, which keeps the app bootable when Redis is
 * not running (see `index.ts` for the fail-open policy).
 */
import { createClient } from 'redis';
import type { RateLimitStore } from './limiter.ts';

/**
 * `INCR` returns 1 on the first hit in a window, which is the only time the
 * expiry needs to be set. Doing both in one script makes the pair atomic.
 */
const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
	redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return count
`;

/** Creates a store backed by one Redis database. */
export function createRedisStore(url: string, prefix = 'internery:ratelimit'): RateLimitStore {
	const client = createClient({
		url,
		// A queued command would wait for a connection that may never come back;
		// the limiter treats a failure as "allow" instead.
		disableOfflineQueue: true,
		socket: {
			connectTimeout: 1_000,
			reconnectStrategy: (retries) => Math.min(retries * 200, 5_000)
		}
	});

	// Node Redis emits `error` for every failed reconnect. The limiter handles
	// failures at call time, so this listener only stops the event from becoming
	// an unhandled error.
	client.on('error', () => {});

	let connecting: Promise<unknown> | null = null;

	return {
		async increment(key, windowMs) {
			if (!client.isOpen) {
				connecting ??= client.connect().finally(() => {
					connecting = null;
				});

				await connecting;
			}

			const count = await client.eval(INCREMENT_SCRIPT, {
				keys: [`${prefix}:${key}`],
				arguments: [String(windowMs)]
			});

			return Number(count);
		}
	};
}
