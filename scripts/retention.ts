/**
 * Runs the database retention jobs.
 *
 * Dry run is the default. `pnpm retention:run --apply` deletes. The storage
 * sweep is separate (`pnpm storage:sweep`), because expired application CVs must
 * be unlinked here before the sweep can remove their objects.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import {
	expireApplicationCv,
	purgeExpiredSessions,
	purgeExpiredVerifications,
	purgeOldAiExplanations,
	purgeOldAiUsage,
	purgeOldAuditLogs,
	purgeOldNotifications,
	type RetentionOptions
} from '#lib/server/services/retention.ts';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
	process.exit(1);
}

const apply = process.argv.includes('--apply');
const client = postgres(databaseUrl, { max: 1 });
const database = drizzle(client, { schema });
const options: RetentionOptions = { dryRun: !apply };

const jobsToRun = [
	{ name: 'application CV snapshots', run: () => expireApplicationCv(database, options) },
	{ name: 'expired sessions', run: () => purgeExpiredSessions(database, options) },
	{ name: 'expired verification tokens', run: () => purgeExpiredVerifications(database, options) },
	{ name: 'notifications', run: () => purgeOldNotifications(database, options) },
	{ name: 'AI explanations', run: () => purgeOldAiExplanations(database, options) },
	{ name: 'AI usage days', run: () => purgeOldAiUsage(database, options) },
	{ name: 'audit logs', run: () => purgeOldAuditLogs(database, options) }
];

for (const job of jobsToRun) {
	const affected = await job.run();

	console.log(`${apply ? 'deleted' : 'would delete'}: ${job.name} — ${affected}`);
}

if (!apply) {
	console.log('Re-run with --apply to delete them.');
}

await client.end();
