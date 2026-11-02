/**
 * Thin wrapper over the S3 API.
 *
 * The bucket is private: objects are only reachable through this server, which
 * holds the credentials. The API never hands out presigned URLs, because a
 * presigned URL is a shareable capability. See `docs/decisions/avatar-storage.md`.
 *
 * S3 vocabulary used here:
 *
 * - **Bucket**: a flat namespace of objects. `avatars/abc.png` is a key that
 *   happens to contain a slash, not a folder.
 *   https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingBucket.html
 * - **ETag**: an opaque validator for the object's bytes, already quoted by S3.
 *   https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag
 * - **ContentType**: metadata stored with the object. S3 never guesses it, and
 *   without it the browser downloads the file instead of displaying it.
 * - **Missing object**: reported as an error (`NoSuchKey` or `NotFound`), not
 *   as an empty response.
 *   https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
 */
import {
	DeleteObjectsCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
	S3ServiceException
} from '@aws-sdk/client-s3';

/** Connection settings for one S3-compatible bucket. */
export type StorageConfig = {
	endpoint: string;
	region: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
};

/** The parts of a downloaded object the API needs to build a response. */
export type StoredObject = {
	body: ReadableStream<Uint8Array>;
	contentType: string | null;
	etag: string | null;
	contentLength: number | null;
};

/** One entry from a bucket listing. */
export type StoredObjectInfo = {
	key: string;
	lastModified: Date | null;
};

/** One page of a bucket listing. `nextToken` is null on the last page. */
export type ObjectPage = {
	objects: StoredObjectInfo[];
	nextToken: string | null;
};

/** The object operations the API needs. Keys are opaque strings, never URLs. */
export type Storage = {
	putObject(key: string, body: Uint8Array, contentType: string): Promise<void>;
	getObject(key: string): Promise<StoredObject | null>;
	deleteObject(key: string): Promise<void>;
	listObjects(prefix: string, continuationToken?: string | null): Promise<ObjectPage>;
	deleteObjects(keys: string[]): Promise<void>;
};

/**
 * Builds a storage client for one bucket.
 *
 * The factory takes its configuration instead of reading the environment, so
 * tests can point it at a test bucket without loading `$app/env/private`. The
 * configured instance lives in `./index.ts`.
 */
export function createStorage(config: StorageConfig): Storage {
	const client = new S3Client({
		endpoint: config.endpoint,
		region: config.region,
		// The SDK signs every request with Signature V4 using this pair. The
		// secret stays on the server; the browser never sees it.
		// https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey
		},
		// MinIO serves buckets as the first path segment (`/bucket/key`). Real
		// S3 defaults to virtual-hosted style (`bucket.s3.amazonaws.com/key`)
		// but still accepts path style, so one setting works for both.
		// https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html
		forcePathStyle: true
	});

	return {
		async putObject(key, body, contentType) {
			// The content type is stored as object metadata; the download route
			// reads it back instead of trusting a file extension.
			await client.send(
				new PutObjectCommand({
					Bucket: config.bucket,
					Key: key,
					Body: body,
					ContentType: contentType
				})
			);
		},

		async getObject(key) {
			try {
				const result = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));

				if (!result.Body) {
					return null;
				}

				return {
					// `Body` arrives as a Node stream. `transformToWebStream` turns
					// it into the web stream a `Response` accepts, without reading
					// the whole object into memory.
					// https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
					body: result.Body.transformToWebStream() as ReadableStream<Uint8Array>,
					// S3 returns the ETag already quoted (`"91e4..."`), which is
					// exactly what an HTTP ETag header expects, so it is passed
					// through unchanged.
					etag: result.ETag ?? null,
					contentType: result.ContentType ?? null,
					contentLength: result.ContentLength ?? null
				};
			} catch (error) {
				if (isMissingObject(error)) {
					return null;
				}

				throw error;
			}
		},

		async deleteObject(key) {
			// S3 deletes are idempotent: removing a key that is already gone is
			// a success, which is what the cleanup paths want.
			// https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html
			await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
		},

		async listObjects(prefix, continuationToken) {
			const result = await client.send(
				new ListObjectsV2Command({
					Bucket: config.bucket,
					Prefix: prefix,
					ContinuationToken: continuationToken ?? undefined,
					MaxKeys: 1000
				})
			);

			const objects: StoredObjectInfo[] = [];

			for (const entry of result.Contents ?? []) {
				if (entry.Key) {
					objects.push({ key: entry.Key, lastModified: entry.LastModified ?? null });
				}
			}

			return {
				objects,
				nextToken: result.IsTruncated ? (result.NextContinuationToken ?? null) : null
			};
		},

		async deleteObjects(keys) {
			// The API accepts at most 1000 keys per request.
			// https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
			for (let index = 0; index < keys.length; index += 1000) {
				const batch = keys.slice(index, index + 1000);

				await client.send(
					new DeleteObjectsCommand({
						Bucket: config.bucket,
						Delete: {
							Objects: batch.map((key) => ({ Key: key })),
							Quiet: true
						}
					})
				);
			}
		}
	};
}

/**
 * Narrows a missing key, which S3 reports as an error rather than an empty result.
 *
 * GetObject answers `404` with `NoSuchKey`; some S3-compatible servers use
 * `NotFound` instead, so both names are accepted.
 */
function isMissingObject(error: unknown): boolean {
	if (!(error instanceof S3ServiceException)) {
		return false;
	}

	return (
		error.name === 'NoSuchKey' ||
		error.name === 'NotFound' ||
		error.$metadata.httpStatusCode === 404
	);
}
