/**
 * Sends the weekly “new jobs fit your week” email.
 *
 * Run it from cron, for example once a day; the query only picks students whose
 * last email is at least a week old, so daily runs are safe and produce at most
 * one email per student per week.
 *
 *   pnpm availability:digest
 *   pnpm availability:digest --dry-run
 *
 * A student with no new matching jobs is skipped and not counted as sent, so
 * the next run still covers them.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import { createEmailSender, type EmailSender } from '#lib/server/email-client.ts';
import {
	digestSince,
	findDigestJobs,
	listDigestCandidates,
	markDigestSent,
	type DigestCandidate,
	type DigestJob
} from '#lib/server/services/availability-digest.ts';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
	process.exit(1);
}

const origin = (process.env.ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '');
const isDryRun = process.argv.includes('--dry-run');

// The script builds the sender from `process.env`, because `$app/env/private`
// does not exist outside SvelteKit. A dry run needs no credentials.
const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM_ADDRESS;
const sender: EmailSender | null =
	apiKey && fromAddress ? createEmailSender({ apiKey, fromAddress }) : null;

if (!isDryRun && sender === null) {
	console.error(
		'RESEND_API_KEY and EMAIL_FROM_ADDRESS are required to send. Use --dry-run to preview.'
	);
	process.exit(1);
}

const database = drizzle(postgres(databaseUrl, { max: 1 }), { schema });

const now = new Date();
const candidates = await listDigestCandidates(database);

let sent = 0;
let skipped = 0;
let failed = 0;

for (const candidate of candidates) {
	const matches = await findDigestJobs(
		database,
		candidate.days,
		candidate.timeOfDay,
		digestSince(candidate.lastSentAt, now)
	);

	if (matches.length === 0) {
		skipped += 1;
		continue;
	}

	if (isDryRun) {
		console.log(`${candidate.email}: ${matches.length} match(es)`);
		report(matches);
		sent += 1;
		continue;
	}

	if (sender === null) {
		failed += 1;
		console.error('Email is not configured.');
		continue;
	}

	try {
		await sender(candidate.email, buildEmail(candidate, matches));
		await markDigestSent(database, candidate.studentId, now);
		sent += 1;
	} catch (error) {
		failed += 1;
		console.error(`Failed to email ${candidate.email}:`, error);
	}
}

console.log(
	`Digest ${isDryRun ? '(dry run) ' : ''}done. candidates=${candidates.length} sent=${sent} skipped=${skipped} failed=${failed}`
);

await database.$client.end();

/** Builds the shared email content for one student. */
function buildEmail(candidate: DigestCandidate, matches: DigestJob[]) {
	const count = matches.length;
	const subject = `${count} new ${count === 1 ? 'shift fits' : 'shifts fit'} your week`;
	const list = matches.map((job) => `${job.title} at ${job.employerName}`).join('; ');

	return {
		subject,
		heading: `New shifts for ${candidate.fullName.split(' ')[0]}`,
		body: `Posted since your last email and inside the free time on your profile: ${list}.`,
		actionLabel: 'See your recommendations',
		actionUrl: `${origin}/recommendations?tab=matches`
	};
}

/** Prints matches during a dry run. */
function report(matches: DigestJob[]): void {
	for (const job of matches) {
		console.log(`  - ${job.title} at ${job.employerName}`);
	}
}
