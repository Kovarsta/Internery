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
import { hashPassword } from '#lib/server/password.ts';

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

const seedJobs = [
	{
		id: '20000000-0000-4000-8000-000000000001',
		categoryName: 'Food & Beverage',
		title: 'Part-time barista',
		description: 'Prepare drinks and serve customers during the morning shift.',
		location: 'Hanoi',
		schedule: 'Weekday mornings, 6:00-10:00',
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
		schedule: 'Saturday and Sunday, 9:00-18:00',
		salaryAmount: 250_000,
		salaryType: 'DAILY',
		positionsNeeded: 1
	},
	{
		id: '20000000-0000-4000-8000-000000000003',
		categoryName: 'Tutoring',
		title: 'Math tutor for grade 9',
		description: 'Two evening sessions per week preparing a student for the entrance exam.',
		location: 'Online',
		schedule: 'Tuesday and Thursday, 19:00-20:30',
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
		schedule: 'One day, 8:00-17:00',
		salaryAmount: 400_000,
		salaryType: 'FIXED',
		positionsNeeded: 5
	}
] as const;

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
	}
] as const;

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
		verifiedAt: new Date()
	};

	await db
		.insert(schema.employerProfiles)
		.values({ userId: employerId, ...employerProfile })
		.onConflictDoUpdate({
			target: schema.employerProfiles.userId,
			set: employerProfile
		});
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

		const values = {
			employerId,
			categoryId,
			title: job.title,
			description: job.description,
			location: job.location,
			schedule: job.schedule,
			salaryAmount: job.salaryAmount,
			salaryType: job.salaryType,
			startDate: addDays(7),
			endDate: addDays(30),
			positionsNeeded: job.positionsNeeded,
			status: 'HIRING' as const
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

	const employerId = requireUserId(userIdsByEmail, 'employer@internery.local');
	const categoryIdsByName = await seedCategoryRows();
	await seedJobRows(employerId, categoryIdsByName);
	await seedApplicationRows(userIdsByEmail);
	await seedNotificationRows(userIdsByEmail);

	console.log('Seed complete.');
	console.log(`  users: ${seedUsers.length}`);
	console.log(`  categories: ${seedCategories.length}`);
	console.log(`  jobs: ${seedJobs.length}`);
	console.log(`  applications: ${seedApplications.length}`);
	console.log(`  notifications: ${seedNotifications.length}`);
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
