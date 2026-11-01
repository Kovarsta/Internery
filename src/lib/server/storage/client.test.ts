import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createStorage } from './client.ts';

// Set the S3_* variables to run the storage tests against MinIO or S3.
const storage = createIfConfigured();

describe.skipIf(!storage)('storage client', () => {
	const key = `tmp/test-${randomUUID()}.txt`;
	const contents = 'internery storage smoke test';

	afterAll(async () => {
		if (!storage) {
			return;
		}

		await storage.deleteObject(key);
	});

	it('stores an object and reads the same bytes back', async () => {
		if (!storage) {
			return;
		}

		await storage.putObject(key, new TextEncoder().encode(contents), 'text/plain');

		const object = await storage.getObject(key);

		if (!object) {
			throw new Error('Expected the uploaded object.');
		}

		expect(object.contentType).toBe('text/plain');
		expect(object.etag).not.toBeNull();
		expect(await new Response(object.body).text()).toBe(contents);
	});

	it('returns null for a key that does not exist', async () => {
		if (!storage) {
			return;
		}

		await expect(storage.getObject(`tmp/missing-${randomUUID()}.txt`)).resolves.toBeNull();
	});

	it('deletes a missing key without an error', async () => {
		if (!storage) {
			return;
		}

		await expect(storage.deleteObject(`tmp/missing-${randomUUID()}.txt`)).resolves.toBeUndefined();
	});
});

/** Builds the client only when every setting is present, so the suite can skip cleanly. */
function createIfConfigured() {
	const endpoint = process.env.S3_ENDPOINT;
	const region = process.env.S3_REGION;
	const bucket = process.env.S3_BUCKET;
	const accessKeyId = process.env.S3_ACCESS_KEY_ID;
	const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

	if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
		return null;
	}

	return createStorage({ endpoint, region, bucket, accessKeyId, secretAccessKey });
}
