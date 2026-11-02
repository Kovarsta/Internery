/**
 * Deletes bucket objects that no database row references any more.
 *
 * Run `pnpm storage:sweep` for a dry run, or `pnpm storage:sweep --apply` to
 * delete. The app never runs this itself; point a scheduler at the command.
 *
 * The database and storage clients are built here from `process.env`, because
 * the app modules read `$app/env/private`, which does not exist outside
 * SvelteKit. `scripts/seed.ts` uses the same pattern.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { createStorage } from '#lib/server/storage/client.ts';
import { SWEEP_GRACE_DAYS, sweepOrphanedObjects } from '#lib/server/storage/sweep.ts';

const databaseUrl = process.env.DATABASE_URL;
const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION;
const bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

if (!databaseUrl) {
	console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
	process.exit(1);
}

if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
	console.error(
		'S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required.'
	);
	process.exit(1);
}

const apply = process.argv.includes('--apply');
const client = postgres(databaseUrl, { max: 1 });
const database = drizzle(client, { schema });
const storage = createStorage({ endpoint, region, bucket, accessKeyId, secretAccessKey });

const result = await sweepOrphanedObjects(database, storage, { dryRun: !apply });

console.log(`scanned ${result.scanned} object(s) with a ${SWEEP_GRACE_DAYS}-day grace period`);
console.log(`${apply ? 'deleted' : 'would delete'} ${result.deleted.length} object(s)`);

for (const key of result.deleted) {
	console.log(`  ${key}`);
}

if (!apply && result.deleted.length > 0) {
	console.log('Re-run with --apply to delete them.');
}

await client.end();
