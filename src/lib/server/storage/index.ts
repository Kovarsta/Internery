import {
	S3_ACCESS_KEY_ID,
	S3_BUCKET,
	S3_ENDPOINT,
	S3_REGION,
	S3_SECRET_ACCESS_KEY
} from '$app/env/private';
import { createStorage } from './client.ts';

/**
 * The shared storage client.
 *
 * These values come from `$app/env/private`, so importing this module from
 * client code fails at build time. That is deliberate: the secret must never
 * reach the browser.
 */
export const storage = createStorage({
	endpoint: S3_ENDPOINT,
	region: S3_REGION,
	bucket: S3_BUCKET,
	accessKeyId: S3_ACCESS_KEY_ID,
	secretAccessKey: S3_SECRET_ACCESS_KEY
});

export type { Storage, StorageConfig, StoredObject } from './client.ts';
