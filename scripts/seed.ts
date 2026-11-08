/**
 * Development seed data.
 *
 * Run `pnpm db:migrate` first, then `pnpm db:seed`. Safe to run repeatedly:
 * users, categories and jobs use fixed ids and conflict-safe writes. The
 * password comes from `SEED_PASSWORD` and defaults to `Password123!`.
 *
 * This script writes directly to the database, so it refuses to run when
 * `NODE_ENV=production`.
 */
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#lib/server/db/schema.ts';
import type { WorkRecordPayload } from '#lib/server/db/product.schema.ts';
import type { DayOfWeek } from '#lib/schedule.ts';
import { hashPassword } from '#lib/server/password.ts';
import { CURRENT_SIGNATURE_VERSION, signWorkRecord } from '#lib/server/work-record-signature.ts';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
	process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
	console.error('Refusing to seed a production database.');
	process.exit(1);
}

const seedPassword = process.env.SEED_PASSWORD ?? 'Password123!';
const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client, { schema });

const seedUsers = [
	{
		id: '00000000-0000-4000-8000-000000000001',
		name: 'Internery Admin',
		email: 'admin@internery.local',
		role: 'ADMIN',
		phone: '0900000001'
	},
	{
		id: '00000000-0000-4000-8000-000000000002',
		name: 'Nguyen Van An',
		email: 'student@internery.local',
		role: 'STUDENT',
		phone: '0900000002'
	},
	{
		id: '00000000-0000-4000-8000-000000000003',
		name: 'Tran Thi Binh',
		email: 'employer@internery.local',
		role: 'EMPLOYER',
		phone: '0900000003'
	},
	{
		id: '00000000-0000-4000-8000-000000000004',
		name: 'Pham Thu Linh',
		email: 'linh@internery.local',
		role: 'STUDENT',
		phone: '0900000004'
	},
	{
		id: '00000000-0000-4000-8000-000000000005',
		name: 'Hoang Quang Minh',
		email: 'minh@internery.local',
		role: 'STUDENT',
		phone: '0900000005'
	}
] as const;

type SeedStudentProfile = {
	email: string;
	university: string;
	major: string;
	skills: string[];
	availability: string;
	bio: string;
};

const seedStudentProfiles: SeedStudentProfile[] = [
	{
		email: 'student@internery.local',
		university: 'Vietnam National University, Hanoi',
		major: 'Computer Science',
		skills: ['TypeScript', 'SQL', 'Customer service'],
		availability: 'Weekday evenings and weekends',
		bio: 'Second-year student looking for part-time work in Hanoi.'
	},
	{
		email: 'linh@internery.local',
		university: 'Hanoi University',
		major: 'English Language',
		skills: ['Barista', 'Customer service', 'English'],
		availability: 'Weekday mornings and weekends',
		bio: 'Third-year student with two years of café experience.'
	},
	{
		email: 'minh@internery.local',
		university: 'Hanoi University of Science and Technology',
		major: 'Mechanical Engineering',
		skills: ['Teamwork', 'Event support', 'Physical work'],
		availability: 'Weekends and university holidays',
		bio: 'First-year student looking for weekend event work.'
	}
];

const seedCategories = [
	{ id: '10000000-0000-4000-8000-000000000001', name: 'Retail' },
	{ id: '10000000-0000-4000-8000-000000000002', name: 'Food & Beverage' },
	{ id: '10000000-0000-4000-8000-000000000003', name: 'Tutoring' },
	{ id: '10000000-0000-4000-8000-000000000004', name: 'Events' },
	{ id: '10000000-0000-4000-8000-000000000005', name: 'Office & Admin' }
];

type SeedJob = {
	id: string;
	categoryName: string;
	title: string;
	description: string;
	location: string;
	daysOfWeek: DayOfWeek[];
	startTime: string;
	endTime: string;
	scheduleNote?: string;
	salaryAmount: number;
	salaryType: 'HOURLY' | 'DAILY' | 'FIXED';
	positionsNeeded: number;
	status?: 'HIRING' | 'COMPLETED';
	startDate?: string;
	endDate?: string;
	/** Admin queue demo: the scam scan flagged this job. */
	needsReview?: boolean;
	flaggedTerms?: string[];
	/** Admin queue demo: the job was hidden by the report threshold. */
	isHidden?: boolean;
	hiddenReason?: string;
};

const seedJobs: SeedJob[] = [
	{
		id: '20000000-0000-4000-8000-000000000001',
		categoryName: 'Food & Beverage',
		title: 'Part-time barista',
		description: 'Prepare drinks and serve customers during the morning shift.',
		location: 'Hanoi',
		daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
		startTime: '06:00',
		endTime: '10:00',
		salaryAmount: 30_000,
		salaryType: 'HOURLY',
		positionsNeeded: 2
	},
	{
		id: '20000000-0000-4000-8000-000000000002',
		categoryName: 'Retail',
		title: 'Weekend retail assistant',
		description: 'Help customers, restock shelves and keep the shop tidy.',
		location: 'Hanoi',
		daysOfWeek: ['SATURDAY', 'SUNDAY'],
		startTime: '09:00',
		endTime: '18:00',
		salaryAmount: 250_000,
		salaryType: 'DAILY',
		positionsNeeded: 1,
		// Flagged, not hidden: the admin can clear the warning and the job stays
		// visible with the banner (AC-43.2).
		needsReview: true,
		flaggedTerms: ['training fee', 'deposit']
	},
	{
		id: '20000000-0000-4000-8000-000000000003',
		categoryName: 'Tutoring',
		title: 'Math tutor for grade 9',
		description: 'Two evening sessions per week preparing a student for the entrance exam.',
		location: 'Online',
		daysOfWeek: ['TUESDAY', 'THURSDAY'],
		startTime: '19:00',
		endTime: '20:30',
		salaryAmount: 150_000,
		salaryType: 'HOURLY',
		positionsNeeded: 1
	},
	{
		id: '20000000-0000-4000-8000-000000000004',
		categoryName: 'Events',
		title: 'Event staff for a product launch',
		description: 'Welcome guests, hand out samples and support the event team.',
		location: 'Ho Chi Minh City',
		daysOfWeek: ['SUNDAY'],
		startTime: '08:00',
		endTime: '17:00',
		scheduleNote: 'A single day: Sunday 15 November 2026.',
		salaryAmount: 400_000,
		salaryType: 'FIXED',
		positionsNeeded: 5,
		startDate: '2026-11-15',
		endDate: '2026-11-16',
		// Auto-hidden by the report threshold, so the moderation queue has an
		// item the admin can restore (AC-42.3).
		isHidden: true,
		hiddenReason: 'Auto-hidden after 3 reports'
	},
	{
		id: '20000000-0000-4000-8000-000000000005',
		categoryName: 'Food & Beverage',
		title: 'Weekend cafe assistant',
		description: 'Serve customers and keep the counter tidy during the weekend rush.',
		location: 'Hanoi',
		daysOfWeek: ['SATURDAY', 'SUNDAY'],
		startTime: '08:00',
		endTime: '16:00',
		salaryAmount: 280_000,
		salaryType: 'DAILY',
		// Three accepted students: two are reviewed and issued work records, and
		// Minh is left unreviewed so the employer's review form has a live row.
		positionsNeeded: 3,
		status: 'COMPLETED',
		startDate: '2026-09-05',
		endDate: '2026-09-27'
	}
];

const seedApplications = [
	{
		id: '30000000-0000-4000-8000-000000000001',
		jobId: seedJobs[0].id,
		studentEmail: 'student@internery.local',
		message: 'I worked as a barista for six months and can start next week.',
		status: 'PENDING',
		rejectReason: null
	},
	{
		id: '30000000-0000-4000-8000-000000000002',
		jobId: seedJobs[1].id,
		studentEmail: 'student@internery.local',
		message: 'I am available every weekend.',
		status: 'REJECTED',
		rejectReason: 'The position was filled before the interview.'
	},
	{
		id: '30000000-0000-4000-8000-000000000003',
		jobId: seedJobs[2].id,
		studentEmail: 'student@internery.local',
		message: 'I tutored grade 9 maths last year.',
		status: 'WITHDRAWN',
		rejectReason: null
	},
	{
		id: '30000000-0000-4000-8000-000000000004',
		jobId: seedJobs[0].id,
		studentEmail: 'linh@internery.local',
		message: 'I have two years of café experience and can work the morning shift.',
		status: 'PENDING',
		rejectReason: null
	},
	{
		id: '30000000-0000-4000-8000-000000000005',
		jobId: seedJobs[0].id,
		studentEmail: 'minh@internery.local',
		message: 'I am a fast learner and free every weekday morning.',
		status: 'PENDING',
		rejectReason: null
	},
	{
		id: '30000000-0000-4000-8000-000000000006',
		jobId: seedJobs[4].id,
		studentEmail: 'student@internery.local',
		message: 'I can cover both weekend days and I am quick with the till.',
		status: 'ACCEPTED',
		rejectReason: null
	},
	{
		id: '30000000-0000-4000-8000-000000000007',
		jobId: seedJobs[4].id,
		studentEmail: 'linh@internery.local',
		message: 'I worked weekends at a cafe for two years.',
		status: 'ACCEPTED',
		rejectReason: null
	},
	{
		// Accepted to the completed job without a review yet, so the employer
		// review form on the applicant profile has a student to act on.
		id: '30000000-0000-4000-8000-000000000008',
		jobId: seedJobs[4].id,
		studentEmail: 'minh@internery.local',
		message: 'I am free at weekends and would like to try cafe work.',
		status: 'ACCEPTED',
		rejectReason: null
	}
] as const;

type SeedReport = {
	id: string;
	jobId: string;
	reporterEmail: string;
	reason: string;
};

/**
 * Open reports behind the moderation queue.
 *
 * The retail job has two, which is below the three-report threshold, so it
 * stays visible with its scam flag. The event job has three and is seeded as
 * auto-hidden, matching what the report flow would have done.
 */
const seedReports: SeedReport[] = [
	{
		id: '70000000-0000-4000-8000-000000000001',
		jobId: seedJobs[1].id,
		reporterEmail: 'student@internery.local',
		reason: 'They ask for a deposit before the first shift.'
	},
	{
		id: '70000000-0000-4000-8000-000000000002',
		jobId: seedJobs[1].id,
		reporterEmail: 'linh@internery.local',
		reason: 'The pay is much lower than the advert says.'
	},
	{
		id: '70000000-0000-4000-8000-000000000003',
		jobId: seedJobs[3].id,
		reporterEmail: 'student@internery.local',
		reason: 'They asked me to pay for a uniform by bank transfer.'
	},
	{
		id: '70000000-0000-4000-8000-000000000004',
		jobId: seedJobs[3].id,
		reporterEmail: 'linh@internery.local',
		reason: 'The contact number is not reachable.'
	},
	{
		id: '70000000-0000-4000-8000-000000000005',
		jobId: seedJobs[3].id,
		reporterEmail: 'minh@internery.local',
		reason: 'The posting looks copied from another site.'
	}
];

type SeedReview = {
	id: string;
	jobId: string;
	reviewerEmail: string;
	revieweeEmail: string;
	rating: number;
	comment: string;
};
const seedReviews: SeedReview[] = [
	{
		id: '50000000-0000-4000-8000-000000000001',
		jobId: seedJobs[4].id,
		reviewerEmail: 'employer@internery.local',
		revieweeEmail: 'student@internery.local',
		rating: 5,
		comment: 'Reliable and calm during the weekend rush. Quick to learn the till.'
	},
	{
		id: '50000000-0000-4000-8000-000000000002',
		jobId: seedJobs[4].id,
		reviewerEmail: 'employer@internery.local',
		revieweeEmail: 'linh@internery.local',
		rating: 4,
		comment: 'Friendly with customers and always on time.'
	},
	{
		// The only student-to-employer review, so the job cards have a rating.
		id: '50000000-0000-4000-8000-000000000003',
		jobId: seedJobs[4].id,
		reviewerEmail: 'student@internery.local',
		revieweeEmail: 'employer@internery.local',
		rating: 5,
		comment: 'Clear instructions and paid on time.'
	}
];

type SeedWorkRecord = {
	id: string;
	jobId: string;
	studentEmail: string;
	reviewId: string;
	isPublic: boolean;
	issuedAt: string;
	publishedAt: string | null;
};

// An's record stays private and Linh's is published, so the demo shows both
// states and the public directory has a card to open.
const seedWorkRecords: SeedWorkRecord[] = [
	{
		id: '60000000-0000-4000-8000-000000000001',
		jobId: seedJobs[4].id,
		studentEmail: 'student@internery.local',
		reviewId: seedReviews[0].id,
		isPublic: false,
		issuedAt: '2026-09-28T09:00:00.000Z',
		publishedAt: null
	},
	{
		id: '60000000-0000-4000-8000-000000000002',
		jobId: seedJobs[4].id,
		studentEmail: 'linh@internery.local',
		reviewId: seedReviews[1].id,
		isPublic: true,
		issuedAt: '2026-09-28T09:05:00.000Z',
		publishedAt: '2026-09-29T08:00:00.000Z'
	}
];

const seedNotifications = [
	{
		id: '40000000-0000-4000-8000-000000000001',
		recipient: 'employer',
		type: 'APPLICATION_RECEIVED',
		title: 'New application',
		body: 'Nguyen Van An applied to Part-time barista.',
		jobId: seedJobs[0].id,
		applicationId: seedApplications[0].id,
		read: false
	},
	{
		id: '40000000-0000-4000-8000-000000000002',
		recipient: 'employer',
		type: 'APPLICATION_WITHDRAWN',
		title: 'Application withdrawn',
		body: 'Nguyen Van An withdrew from Math tutor for grade 9.',
		jobId: seedJobs[2].id,
		applicationId: seedApplications[2].id,
		read: true
	},
	{
		id: '40000000-0000-4000-8000-000000000003',
		recipient: 'student',
		type: 'APPLICATION_REJECTED',
		title: 'Application rejected',
		body: 'Weekend retail assistant is no longer available.',
		jobId: seedJobs[1].id,
		applicationId: seedApplications[1].id,
		read: false
	},
	{
		id: '40000000-0000-4000-8000-000000000004',
		recipient: 'employer',
		type: 'APPLICATION_RECEIVED',
		title: 'New application',
		body: 'Pham Thu Linh applied to Part-time barista.',
		jobId: seedJobs[0].id,
		applicationId: seedApplications[3].id,
		read: false
	},
	{
		id: '40000000-0000-4000-8000-000000000005',
		recipient: 'employer',
		type: 'APPLICATION_RECEIVED',
		title: 'New application',
		body: 'Hoang Quang Minh applied to Part-time barista.',
		jobId: seedJobs[0].id,
		applicationId: seedApplications[4].id,
		read: false
	}
] as const;

function addDays(days: number): string {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() + days);

	return date.toISOString().slice(0, 10);
}

function requireUserId(userIdsByEmail: Map<string, string>, email: string): string {
	const userId = userIdsByEmail.get(email);

	if (!userId) {
		throw new Error(`Could not find the seed user ${email}.`);
	}

	return userId;
}

async function seedUserAccounts(passwordHash: string): Promise<Map<string, string>> {
	const userIdsByEmail = new Map<string, string>();

	for (const user of seedUsers) {
		await db
			.insert(schema.users)
			.values({
				id: user.id,
				name: user.name,
				email: user.email,
				emailVerified: true,
				role: user.role,
				status: 'ACTIVE'
			})
			.onConflictDoNothing();

		const [stored] = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.email, user.email))
			.limit(1);

		if (!stored) {
			throw new Error(`Could not seed the user ${user.email}.`);
		}

		userIdsByEmail.set(user.email, stored.id);
		await ensureCredentialAccount(stored.id, passwordHash);
	}

	return userIdsByEmail;
}

async function ensureCredentialAccount(userId: string, passwordHash: string): Promise<void> {
	const [existing] = await db
		.select({ id: schema.accounts.id })
		.from(schema.accounts)
		.where(and(eq(schema.accounts.userId, userId), eq(schema.accounts.providerId, 'credential')))
		.limit(1);

	if (existing) {
		await db
			.update(schema.accounts)
			.set({ password: passwordHash })
			.where(eq(schema.accounts.id, existing.id));

		return;
	}

	await db.insert(schema.accounts).values({
		userId,
		accountId: userId,
		providerId: 'credential',
		password: passwordHash
	});
}

async function seedProfiles(userIdsByEmail: Map<string, string>) {
	const userProfileRows = seedUsers.map((user) => ({
		userId: requireUserId(userIdsByEmail, user.email),
		phone: user.phone
	}));

	await db.insert(schema.userProfiles).values(userProfileRows).onConflictDoNothing();

	for (const studentProfile of seedStudentProfiles) {
		const { email, ...profile } = studentProfile;

		await db
			.insert(schema.studentProfiles)
			.values({ userId: requireUserId(userIdsByEmail, email), ...profile })
			.onConflictDoUpdate({
				target: schema.studentProfiles.userId,
				set: profile
			});
	}

	const employerId = requireUserId(userIdsByEmail, 'employer@internery.local');
	const employerProfile = {
		orgName: 'Acme Coffee',
		orgType: 'COMPANY' as const,
		description: 'A small specialty coffee shop in central Hanoi.',
		address: '12 Nguyen Trai, Hanoi',
		contactPhone: '0900000003',
		verificationStatus: 'VERIFIED' as const,
		verifiedAt: new Date(),
		// Matches the student-to-employer review below, so cards show a rating.
		ratingAvg: 5,
		ratingCount: 1
	};

	await db
		.insert(schema.employerProfiles)
		.values({ userId: employerId, ...employerProfile })
		.onConflictDoUpdate({
			target: schema.employerProfiles.userId,
			set: employerProfile
		});
}

/**
 * Writes the approved request behind the demo employer's Verified badge.
 *
 * The profile says `VERIFIED`, so the request page needs one approved row to show the outcome.
 */
async function seedVerificationRows(userIdsByEmail: Map<string, string>) {
	const values = {
		employerId: requireUserId(userIdsByEmail, 'employer@internery.local'),
		orgName: 'Acme Coffee',
		websiteUrl: 'https://acme-coffee.example',
		contactInfo: 'Tran Thi Binh, 0900000003',
		licenseKey: null,
		status: 'APPROVED' as const,
		rejectReason: null,
		reviewedBy: requireUserId(userIdsByEmail, 'admin@internery.local'),
		reviewedAt: new Date('2026-08-21T10:00:00.000Z'),
		createdAt: new Date('2026-08-20T09:00:00.000Z')
	};

	await db
		.insert(schema.verificationRequests)
		.values({ id: '40000000-0000-4000-8000-000000000001', ...values })
		.onConflictDoUpdate({ target: schema.verificationRequests.id, set: values });
}

async function seedCategoryRows(): Promise<Map<string, string>> {
	await db.insert(schema.categories).values(seedCategories).onConflictDoNothing();

	const stored = await db
		.select({ id: schema.categories.id, name: schema.categories.name })
		.from(schema.categories);

	return new Map(stored.map((category) => [category.name, category.id]));
}

async function seedJobRows(employerId: string, categoryIdsByName: Map<string, string>) {
	for (const job of seedJobs) {
		const categoryId = categoryIdsByName.get(job.categoryName);

		if (!categoryId) {
			throw new Error(`Missing category ${job.categoryName}.`);
		}

		const isCompleted = job.status === 'COMPLETED';

		const values = {
			employerId,
			categoryId,
			title: job.title,
			description: job.description,
			location: job.location,
			daysOfWeek: job.daysOfWeek,
			startTime: job.startTime,
			endTime: job.endTime,
			scheduleNote: job.scheduleNote ?? null,
			salaryAmount: job.salaryAmount,
			salaryType: job.salaryType,
			startDate: job.startDate ?? addDays(7),
			endDate: job.endDate ?? addDays(30),
			positionsNeeded: job.positionsNeeded,
			status: job.status ?? 'HIRING',
			completedAt: isCompleted ? new Date('2026-09-28T09:00:00.000Z') : null,
			needsReview: job.needsReview ?? false,
			flaggedTerms: job.flaggedTerms ?? [],
			isHidden: job.isHidden ?? false,
			hiddenReason: job.hiddenReason ?? null,
			hiddenBy: null,
			hiddenAt: job.isHidden ? new Date('2026-10-20T09:00:00.000Z') : null
		};

		await db
			.insert(schema.jobs)
			.values({ id: job.id, ...values })
			.onConflictDoUpdate({
				target: schema.jobs.id,
				set: values
			});
	}
}

async function seedApplicationRows(userIdsByEmail: Map<string, string>) {
	for (const application of seedApplications) {
		const isPending = application.status === 'PENDING';
		const studentId = requireUserId(userIdsByEmail, application.studentEmail);

		await db
			.insert(schema.applications)
			.values({
				id: application.id,
				jobId: application.jobId,
				studentId,
				message: application.message,
				status: application.status,
				rejectReason: application.rejectReason,
				decidedAt: isPending ? null : new Date()
			})
			.onConflictDoNothing();
	}
}

async function seedReportRows(userIdsByEmail: Map<string, string>) {
	for (const report of seedReports) {
		await db
			.insert(schema.reports)
			.values({
				id: report.id,
				jobId: report.jobId,
				reporterId: requireUserId(userIdsByEmail, report.reporterEmail),
				reason: report.reason,
				status: 'OPEN'
			})
			.onConflictDoNothing();
	}
}

async function seedReviewRows(userIdsByEmail: Map<string, string>) {
	for (const review of seedReviews) {
		const values = {
			jobId: review.jobId,
			reviewerId: requireUserId(userIdsByEmail, review.reviewerEmail),
			revieweeId: requireUserId(userIdsByEmail, review.revieweeEmail),
			rating: review.rating,
			comment: review.comment
		};

		await db
			.insert(schema.reviews)
			.values({ id: review.id, ...values })
			.onConflictDoUpdate({ target: schema.reviews.id, set: values });
	}
}

/**
 * Writes the signed work records that the demo pages read.
 *
 * The payload copies what `createReview` writes, including the employer's
 * organisation name. Re-seeding re-signs the row, so a changed
 * `WORK_RECORD_SECRET` does not leave demo records that fail verification.
 */
async function seedWorkRecordRows(userIdsByEmail: Map<string, string>) {
	const secret = process.env.WORK_RECORD_SECRET;

	if (!secret) {
		console.warn('WORK_RECORD_SECRET is not set; skipping the demo work records.');
		return;
	}

	const employerId = requireUserId(userIdsByEmail, 'employer@internery.local');
	const [employerProfile] = await db
		.select({ orgName: schema.employerProfiles.orgName })
		.from(schema.employerProfiles)
		.where(eq(schema.employerProfiles.userId, employerId))
		.limit(1);

	for (const record of seedWorkRecords) {
		const review = seedReviews.find((candidate) => candidate.id === record.reviewId);
		const job = seedJobs.find((candidate) => candidate.id === record.jobId);
		const student = seedUsers.find((user) => user.email === record.studentEmail);

		if (!review || !job || !student || !job.startDate || !job.endDate) {
			throw new Error(`Incomplete seed work record ${record.id}.`);
		}

		const payload: WorkRecordPayload = {
			recordId: record.id,
			studentName: student.name,
			employerName: employerProfile?.orgName ?? 'Employer',
			jobTitle: job.title,
			startDate: job.startDate,
			endDate: job.endDate,
			rating: review.rating,
			comment: review.comment,
			issuedAt: record.issuedAt
		};

		const values = {
			jobId: record.jobId,
			studentId: requireUserId(userIdsByEmail, record.studentEmail),
			employerId,
			reviewId: record.reviewId,
			payload,
			signature: signWorkRecord(payload, secret),
			signatureVersion: CURRENT_SIGNATURE_VERSION,
			isPublic: record.isPublic,
			publishedAt: record.publishedAt === null ? null : new Date(record.publishedAt)
		};

		await db
			.insert(schema.workRecords)
			.values({ id: record.id, ...values })
			.onConflictDoUpdate({ target: schema.workRecords.id, set: values });
	}
}

async function seedNotificationRows(userIdsByEmail: Map<string, string>) {
	const recipients = new Map([
		['student', requireUserId(userIdsByEmail, 'student@internery.local')],
		['employer', requireUserId(userIdsByEmail, 'employer@internery.local')]
	]);

	for (const notification of seedNotifications) {
		const userId = recipients.get(notification.recipient);

		if (!userId) {
			throw new Error(`Unknown notification recipient ${notification.recipient}.`);
		}

		await db
			.insert(schema.notifications)
			.values({
				id: notification.id,
				userId,
				type: notification.type,
				title: notification.title,
				body: notification.body,
				jobId: notification.jobId,
				applicationId: notification.applicationId,
				readAt: notification.read ? new Date() : null
			})
			.onConflictDoNothing();
	}
}

async function main() {
	const passwordHash = await hashPassword(seedPassword);
	const userIdsByEmail = await seedUserAccounts(passwordHash);

	await seedProfiles(userIdsByEmail);
	await seedVerificationRows(userIdsByEmail);

	const employerId = requireUserId(userIdsByEmail, 'employer@internery.local');
	const categoryIdsByName = await seedCategoryRows();
	await seedJobRows(employerId, categoryIdsByName);
	await seedApplicationRows(userIdsByEmail);
	await seedReviewRows(userIdsByEmail);
	await seedWorkRecordRows(userIdsByEmail);
	await seedNotificationRows(userIdsByEmail);
	await seedReportRows(userIdsByEmail);

	console.log('Seed complete.');
	console.log(`  users: ${seedUsers.length}`);
	console.log(`  categories: ${seedCategories.length}`);
	console.log(`  jobs: ${seedJobs.length}`);
	console.log(`  applications: ${seedApplications.length}`);
	console.log(`  reviews: ${seedReviews.length}`);
	console.log(`  work records: ${seedWorkRecords.length}`);
	console.log('  verification requests: 1');
	console.log(`  notifications: ${seedNotifications.length}`);
	console.log(`  reports: ${seedReports.length}`);
	console.log('');
	console.log('Sign in with:');

	for (const user of seedUsers) {
		console.log(`  ${user.email} / ${seedPassword}`);
	}
}

try {
	await main();
} finally {
	await client.end();
}
