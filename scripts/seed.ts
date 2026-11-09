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
import { normalizeSearchText } from '#lib/search.ts';
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
	},
	{
		id: '00000000-0000-4000-8000-000000000006',
		name: 'Le Thu Trang',
		email: 'studyhub@internery.local',
		role: 'EMPLOYER',
		phone: '0900000006'
	},
	{
		id: '00000000-0000-4000-8000-000000000007',
		name: 'Vo Ha My',
		email: 'eventcrew@internery.local',
		role: 'EMPLOYER',
		phone: '0900000007'
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

type SeedEmployerProfile = {
	email: string;
	orgName: string;
	orgType: 'COMPANY' | 'INDIVIDUAL';
	description: string;
	address: string;
	contactPhone: string;
	verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
	verifiedAt?: Date;
	ratingAvg?: number;
	ratingCount?: number;
};

/**
 * Employer profiles for the demo.
 *
 * Acme Coffee keeps its real seeded review and Verified badge. The other two
 * employers give the home page and job cards some variety.
 */
const seedEmployerProfiles: SeedEmployerProfile[] = [
	{
		email: 'employer@internery.local',
		orgName: 'Acme Coffee',
		orgType: 'COMPANY',
		description: 'A small specialty coffee shop in central Hanoi.',
		address: '12 Nguyen Trai, Hanoi',
		contactPhone: '0900000003',
		verificationStatus: 'VERIFIED',
		verifiedAt: new Date(),
		// Matches the student-to-employer review below, so cards show a rating.
		ratingAvg: 5,
		ratingCount: 1
	},
	{
		email: 'studyhub@internery.local',
		orgName: 'Hanoi Study Hub',
		orgType: 'COMPANY',
		description: 'A tutoring centre for secondary and high-school students.',
		address: '45 Chua Boc, Hanoi',
		contactPhone: '0900000006',
		verificationStatus: 'UNVERIFIED'
	},
	{
		email: 'eventcrew@internery.local',
		orgName: 'Saigon Event Crew',
		orgType: 'COMPANY',
		description: 'Event staffing for launches, conferences and campus tours.',
		address: '88 Le Loi, Ho Chi Minh City',
		contactPhone: '0900000007',
		verificationStatus: 'UNVERIFIED'
	}
];

const seedCategories = [
	{ id: '10000000-0000-4000-8000-000000000001', name: 'Retail' },
	{ id: '10000000-0000-4000-8000-000000000002', name: 'Food & Beverage' },
	{ id: '10000000-0000-4000-8000-000000000003', name: 'Tutoring' },
	{ id: '10000000-0000-4000-8000-000000000004', name: 'Events' },
	{ id: '10000000-0000-4000-8000-000000000005', name: 'Office & Admin' },
	{ id: '10000000-0000-4000-8000-000000000006', name: 'Hospitality & Tourism' },
	{ id: '10000000-0000-4000-8000-000000000007', name: 'Customer Service' },
	{ id: '10000000-0000-4000-8000-000000000008', name: 'Delivery & Logistics' },
	{ id: '10000000-0000-4000-8000-000000000009', name: 'Sales' },
	{ id: '10000000-0000-4000-8000-000000000010', name: 'Marketing & Social Media' },
	{ id: '10000000-0000-4000-8000-000000000011', name: 'Design & Creative' },
	{ id: '10000000-0000-4000-8000-000000000012', name: 'IT & Software' },
	{ id: '10000000-0000-4000-8000-000000000013', name: 'Translation' },
	{ id: '10000000-0000-4000-8000-000000000014', name: 'Education & Training' },
	{ id: '10000000-0000-4000-8000-000000000015', name: 'Healthcare & Pharmacy' },
	{ id: '10000000-0000-4000-8000-000000000016', name: 'Beauty & Wellness' },
	{ id: '10000000-0000-4000-8000-000000000017', name: 'Fitness & Sports' },
	{ id: '10000000-0000-4000-8000-000000000018', name: 'Warehouse & Inventory' },
	{ id: '10000000-0000-4000-8000-000000000019', name: 'Cleaning & Housekeeping' },
	{ id: '10000000-0000-4000-8000-000000000020', name: 'Childcare & Babysitting' },
	{ id: '10000000-0000-4000-8000-000000000021', name: 'Security' },
	{ id: '10000000-0000-4000-8000-000000000022', name: 'Finance & Accounting' }
];

/**
 * Canonical places for the demo.
 *
 * The ids match the reference rows inserted by the locations migration, so the
 * seed updates them instead of creating duplicates. `searchText` is generated
 * from the name, country and aliases at write time.
 */
const seedLocations = [
	{
		id: '80000000-0000-4000-8000-000000000001',
		countryCode: 'VN',
		countryName: 'Vietnam',
		name: 'Hanoi',
		displayName: 'Hanoi, Vietnam',
		slug: 'hanoi',
		aliases: ['Ha Noi', 'Hà Nội', 'HN'],
		isRemote: false
	},
	{
		id: '80000000-0000-4000-8000-000000000002',
		countryCode: 'VN',
		countryName: 'Vietnam',
		name: 'Ho Chi Minh City',
		displayName: 'Ho Chi Minh City, Vietnam',
		slug: 'ho-chi-minh-city',
		aliases: ['HCM', 'HCMC', 'TPHCM', 'TP.HCM', 'Ho Chi Minh', 'Saigon', 'Sai Gon', 'Sài Gòn'],
		isRemote: false
	},
	{
		id: '80000000-0000-4000-8000-000000000003',
		countryCode: 'VN',
		countryName: 'Vietnam',
		name: 'Da Nang',
		displayName: 'Da Nang, Vietnam',
		slug: 'da-nang',
		aliases: ['Đà Nẵng', 'DN'],
		isRemote: false
	},
	{
		id: '80000000-0000-4000-8000-000000000004',
		countryCode: 'VN',
		countryName: 'Vietnam',
		name: 'Hai Phong',
		displayName: 'Hai Phong, Vietnam',
		slug: 'hai-phong',
		aliases: ['Hải Phòng', 'HP'],
		isRemote: false
	},
	{
		id: '80000000-0000-4000-8000-000000000005',
		countryCode: 'VN',
		countryName: 'Vietnam',
		name: 'Can Tho',
		displayName: 'Can Tho, Vietnam',
		slug: 'can-tho',
		aliases: ['Cần Thơ', 'CT'],
		isRemote: false
	},
	{
		id: '80000000-0000-4000-8000-000000000006',
		countryCode: 'VN',
		countryName: 'Vietnam',
		name: 'Hue',
		displayName: 'Hue, Vietnam',
		slug: 'hue',
		aliases: ['Huế'],
		isRemote: false
	},
	{
		id: '80000000-0000-4000-8000-000000000007',
		countryCode: 'VN',
		countryName: 'Vietnam',
		name: 'Online',
		displayName: 'Online',
		slug: 'online',
		aliases: ['Remote', 'Work from home', 'WFH'],
		isRemote: true
	}
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
	},
	{
		id: '20000000-0000-4000-8000-000000000006',
		categoryName: 'Food & Beverage',
		title: 'Cafe counter assistant',
		description: 'Take orders, prepare simple drinks and keep the counter clean.',
		location: 'Hanoi',
		daysOfWeek: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
		startTime: '07:00',
		endTime: '11:00',
		salaryAmount: 32_000,
		salaryType: 'HOURLY',
		positionsNeeded: 2
	},
	{
		id: '20000000-0000-4000-8000-000000000007',
		categoryName: 'Food & Beverage',
		title: 'Bakery shop helper',
		description: 'Pack fresh bread and serve customers during the morning rush.',
		location: 'Hanoi',
		daysOfWeek: ['SATURDAY', 'SUNDAY'],
		startTime: '06:00',
		endTime: '12:00',
		salaryAmount: 240_000,
		salaryType: 'DAILY',
		positionsNeeded: 1
	},
	{
		id: '20000000-0000-4000-8000-000000000008',
		categoryName: 'Retail',
		title: 'Supermarket stock assistant',
		description: 'Restock shelves and help shoppers find products in the afternoon.',
		location: 'Hanoi',
		daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
		startTime: '14:00',
		endTime: '18:00',
		salaryAmount: 28_000,
		salaryType: 'HOURLY',
		positionsNeeded: 3
	},
	{
		id: '20000000-0000-4000-8000-000000000009',
		categoryName: 'Retail',
		title: 'Bookshop weekend clerk',
		description: 'Help customers, arrange displays and keep the shelves tidy.',
		location: 'Da Nang',
		daysOfWeek: ['SATURDAY', 'SUNDAY'],
		startTime: '09:00',
		endTime: '17:00',
		salaryAmount: 220_000,
		salaryType: 'DAILY',
		positionsNeeded: 1
	},
	{
		id: '20000000-0000-4000-8000-000000000010',
		categoryName: 'Tutoring',
		title: 'English tutor for primary students',
		description: 'Two online sessions per week focused on speaking and vocabulary.',
		location: 'Online',
		daysOfWeek: ['TUESDAY', 'THURSDAY'],
		startTime: '17:00',
		endTime: '19:00',
		salaryAmount: 120_000,
		salaryType: 'HOURLY',
		positionsNeeded: 2
	},
	{
		id: '20000000-0000-4000-8000-000000000011',
		categoryName: 'Tutoring',
		title: 'Physics tutor for grade 12',
		description: 'Prepare weekly lessons and practice problems for the national exam.',
		location: 'Hanoi',
		daysOfWeek: ['MONDAY', 'WEDNESDAY'],
		startTime: '19:30',
		endTime: '21:00',
		salaryAmount: 180_000,
		salaryType: 'HOURLY',
		positionsNeeded: 1
	},
	{
		id: '20000000-0000-4000-8000-000000000012',
		categoryName: 'Office & Admin',
		title: 'Library shelving assistant',
		description: 'Return books to the shelves and keep the reading room in order.',
		location: 'Hanoi',
		daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
		startTime: '08:00',
		endTime: '12:00',
		salaryAmount: 25_000,
		salaryType: 'HOURLY',
		positionsNeeded: 2
	},
	{
		id: '20000000-0000-4000-8000-000000000013',
		categoryName: 'Office & Admin',
		title: 'Data entry assistant',
		description: 'Enter supplier invoices into a spreadsheet and check for duplicates.',
		location: 'Online',
		daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
		startTime: '13:00',
		endTime: '17:00',
		salaryAmount: 30_000,
		salaryType: 'HOURLY',
		positionsNeeded: 4
	},
	{
		id: '20000000-0000-4000-8000-000000000014',
		categoryName: 'Marketing & Social Media',
		title: 'Social media content assistant',
		description: 'Draft short posts and schedule them for a small local brand.',
		location: 'Online',
		daysOfWeek: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
		startTime: '18:00',
		endTime: '21:00',
		scheduleNote: 'A portfolio or sample post is welcome.',
		salaryAmount: 45_000,
		salaryType: 'HOURLY',
		positionsNeeded: 1
	},
	{
		id: '20000000-0000-4000-8000-000000000015',
		categoryName: 'Events',
		title: 'Event registration staff',
		description: 'Check guests in, hand out badges and guide them to the hall.',
		location: 'Ho Chi Minh City',
		daysOfWeek: ['SATURDAY'],
		startTime: '07:00',
		endTime: '15:00',
		salaryAmount: 350_000,
		salaryType: 'FIXED',
		positionsNeeded: 6
	},
	{
		id: '20000000-0000-4000-8000-000000000016',
		categoryName: 'Hospitality & Tourism',
		title: 'Hotel breakfast server',
		description: 'Set the buffet, refill dishes and clear tables during breakfast.',
		location: 'Da Nang',
		daysOfWeek: ['SATURDAY', 'SUNDAY'],
		startTime: '06:00',
		endTime: '11:00',
		salaryAmount: 260_000,
		salaryType: 'DAILY',
		positionsNeeded: 2
	},
	{
		id: '20000000-0000-4000-8000-000000000017',
		categoryName: 'Customer Service',
		title: 'Cinema usher',
		description: 'Check tickets, help guests find their screen and tidy the lobby.',
		location: 'Hanoi',
		daysOfWeek: ['FRIDAY', 'SATURDAY', 'SUNDAY'],
		startTime: '17:00',
		endTime: '22:00',
		salaryAmount: 35_000,
		salaryType: 'HOURLY',
		positionsNeeded: 3
	},
	{
		id: '20000000-0000-4000-8000-000000000018',
		categoryName: 'Customer Service',
		title: 'Call centre assistant',
		description: 'Answer routine customer questions and log each call.',
		location: 'Hanoi',
		daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
		startTime: '17:30',
		endTime: '21:00',
		salaryAmount: 40_000,
		salaryType: 'HOURLY',
		positionsNeeded: 5
	},
	{
		id: '20000000-0000-4000-8000-000000000019',
		categoryName: 'Warehouse & Inventory',
		title: 'Warehouse packing assistant',
		description: 'Pack online orders and label boxes for the afternoon courier.',
		location: 'Hai Phong',
		daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
		startTime: '08:00',
		endTime: '16:00',
		salaryAmount: 300_000,
		salaryType: 'DAILY',
		positionsNeeded: 4
	},
	{
		id: '20000000-0000-4000-8000-000000000020',
		categoryName: 'Hospitality & Tourism',
		title: 'Tour guide assistant',
		description: 'Meet the group, hand out tickets and keep the walking tour on time.',
		location: 'Hue',
		daysOfWeek: ['SATURDAY', 'SUNDAY'],
		startTime: '08:00',
		endTime: '18:00',
		salaryAmount: 320_000,
		salaryType: 'DAILY',
		positionsNeeded: 2
	},
	{
		id: '20000000-0000-4000-8000-000000000021',
		categoryName: 'Fitness & Sports',
		title: 'Gym front desk assistant',
		description: 'Welcome members, check passes and keep the entrance tidy.',
		location: 'Hanoi',
		daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
		startTime: '06:00',
		endTime: '09:00',
		salaryAmount: 30_000,
		salaryType: 'HOURLY',
		positionsNeeded: 1
	},
	{
		id: '20000000-0000-4000-8000-000000000022',
		categoryName: 'Translation',
		title: 'Translator for a student club',
		description: 'Translate short announcements and event notes between English and Vietnamese.',
		location: 'Online',
		daysOfWeek: ['TUESDAY', 'THURSDAY'],
		startTime: '20:00',
		endTime: '21:30',
		salaryAmount: 100_000,
		salaryType: 'HOURLY',
		positionsNeeded: 2
	},
	{
		id: '20000000-0000-4000-8000-000000000023',
		categoryName: 'Education & Training',
		title: 'Exam invigilator',
		description: 'Check candidate details and keep the exam room quiet.',
		location: 'Hue',
		daysOfWeek: ['SATURDAY'],
		startTime: '08:00',
		endTime: '12:00',
		salaryAmount: 50_000,
		salaryType: 'HOURLY',
		positionsNeeded: 3
	},
	{
		id: '20000000-0000-4000-8000-000000000024',
		categoryName: 'Cleaning & Housekeeping',
		title: 'Co-working space cleaner',
		description: 'Tidy the desks and meeting rooms after the working day.',
		location: 'Hanoi',
		daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
		startTime: '18:00',
		endTime: '20:00',
		salaryAmount: 30_000,
		salaryType: 'HOURLY',
		positionsNeeded: 2
	},
	{
		id: '20000000-0000-4000-8000-000000000025',
		categoryName: 'Hospitality & Tourism',
		title: 'Campus tour assistant',
		description: 'Guide visiting students around the campus and answer questions.',
		location: 'Hanoi',
		daysOfWeek: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
		startTime: '09:00',
		endTime: '11:00',
		salaryAmount: 35_000,
		salaryType: 'HOURLY',
		positionsNeeded: 4
	},
	{
		id: '20000000-0000-4000-8000-000000000026',
		categoryName: 'Sales',
		title: 'Phone shop sales assistant',
		description: 'Greet walk-in customers, show phone models and explain the plans.',
		location: 'Hanoi',
		daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
		startTime: '17:00',
		endTime: '21:00',
		salaryAmount: 35_000,
		salaryType: 'HOURLY',
		positionsNeeded: 2
	},
	{
		id: '20000000-0000-4000-8000-000000000027',
		categoryName: 'Design & Creative',
		title: 'Junior graphic designer',
		description: 'Prepare simple social posts and event posters from existing templates.',
		location: 'Online',
		daysOfWeek: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
		startTime: '09:00',
		endTime: '12:00',
		scheduleNote: 'A portfolio or two sample designs is welcome.',
		salaryAmount: 80_000,
		salaryType: 'HOURLY',
		positionsNeeded: 1
	},
	{
		id: '20000000-0000-4000-8000-000000000028',
		categoryName: 'IT & Software',
		title: 'Front-end web assistant',
		description: 'Fix small layout issues and update components on a student club website.',
		location: 'Online',
		daysOfWeek: ['TUESDAY', 'THURSDAY'],
		startTime: '18:00',
		endTime: '21:00',
		salaryAmount: 100_000,
		salaryType: 'HOURLY',
		positionsNeeded: 1
	},
	{
		id: '20000000-0000-4000-8000-000000000029',
		categoryName: 'Healthcare & Pharmacy',
		title: 'Pharmacy counter assistant',
		description: 'Arrange shelves, check stock and help customers find basic products.',
		location: 'Hanoi',
		daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
		startTime: '08:00',
		endTime: '12:00',
		salaryAmount: 32_000,
		salaryType: 'HOURLY',
		positionsNeeded: 2
	},
	{
		id: '20000000-0000-4000-8000-000000000030',
		categoryName: 'Beauty & Wellness',
		title: 'Nail salon assistant',
		description: 'Welcome guests, prepare stations and keep the salon tidy.',
		location: 'Ho Chi Minh City',
		daysOfWeek: ['SATURDAY', 'SUNDAY'],
		startTime: '09:00',
		endTime: '18:00',
		salaryAmount: 260_000,
		salaryType: 'DAILY',
		positionsNeeded: 2
	},
	{
		id: '20000000-0000-4000-8000-000000000031',
		categoryName: 'Childcare & Babysitting',
		title: 'Weekend babysitter',
		description: 'Look after two primary-school children at home on weekend days.',
		location: 'Hanoi',
		daysOfWeek: ['SATURDAY', 'SUNDAY'],
		startTime: '08:00',
		endTime: '17:00',
		scheduleNote: 'Two children, ages 5 and 8.',
		salaryAmount: 300_000,
		salaryType: 'DAILY',
		positionsNeeded: 1
	},
	{
		id: '20000000-0000-4000-8000-000000000032',
		categoryName: 'Security',
		title: 'Event security assistant',
		description: 'Check wristbands, guide queues and keep the event entrance clear.',
		location: 'Ho Chi Minh City',
		daysOfWeek: ['SATURDAY'],
		startTime: '16:00',
		endTime: '22:00',
		salaryAmount: 400_000,
		salaryType: 'FIXED',
		positionsNeeded: 4
	},
	{
		id: '20000000-0000-4000-8000-000000000033',
		categoryName: 'Finance & Accounting',
		title: 'Accounting intern',
		description: 'Organise receipts and enter monthly expenses into the ledger.',
		location: 'Hanoi',
		daysOfWeek: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
		startTime: '08:00',
		endTime: '12:00',
		salaryAmount: 45_000,
		salaryType: 'HOURLY',
		positionsNeeded: 1
	},
	{
		id: '20000000-0000-4000-8000-000000000034',
		categoryName: 'Delivery & Logistics',
		title: 'Delivery rider assistant',
		description: 'Collect parcels from the shop and deliver them around the district.',
		location: 'Hanoi',
		daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
		startTime: '10:00',
		endTime: '14:00',
		salaryAmount: 40_000,
		salaryType: 'HOURLY',
		positionsNeeded: 3
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
	},
	{
		// The extra employers need recent applications so the featured ranking
		// has more than one company to show.
		id: '30000000-0000-4000-8000-000000000009',
		jobId: seedJobs[14].id,
		studentEmail: 'linh@internery.local',
		message: 'I have helped at two campus events and can manage a check-in desk.',
		status: 'PENDING',
		rejectReason: null
	},
	{
		id: '30000000-0000-4000-8000-000000000010',
		jobId: seedJobs[14].id,
		studentEmail: 'minh@internery.local',
		message: 'I am free that weekend and comfortable greeting large groups.',
		status: 'PENDING',
		rejectReason: null
	},
	{
		id: '30000000-0000-4000-8000-000000000011',
		jobId: seedJobs[9].id,
		studentEmail: 'student@internery.local',
		message: 'I can help with speaking practice and basic vocabulary drills.',
		status: 'PENDING',
		rejectReason: null
	},
	{
		id: '30000000-0000-4000-8000-000000000012',
		jobId: seedJobs[9].id,
		studentEmail: 'linh@internery.local',
		message: 'I study English and have tutored primary students before.',
		status: 'PENDING',
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

	for (const employerProfile of seedEmployerProfiles) {
		const { email, ...profile } = employerProfile;
		const values = {
			...profile,
			verifiedAt: profile.verifiedAt ?? null,
			ratingAvg: profile.ratingAvg ?? 0,
			ratingCount: profile.ratingCount ?? 0
		};

		await db
			.insert(schema.employerProfiles)
			.values({ userId: requireUserId(userIdsByEmail, email), ...values })
			.onConflictDoUpdate({
				target: schema.employerProfiles.userId,
				set: values
			});
	}
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

async function seedLocationRows(): Promise<Map<string, string>> {
	for (const location of seedLocations) {
		const searchText = normalizeSearchText(
			[location.name, location.displayName, location.countryName, ...location.aliases].join(' ')
		);

		const values = { ...location, searchText };

		await db
			.insert(schema.locations)
			.values(values)
			.onConflictDoUpdate({ target: schema.locations.id, set: values });
	}

	const stored = await db
		.select({ id: schema.locations.id, name: schema.locations.name })
		.from(schema.locations);

	return new Map(stored.map((location) => [location.name, location.id]));
}

async function seedCategoryRows(): Promise<Map<string, string>> {
	await db.insert(schema.categories).values(seedCategories).onConflictDoNothing();

	const stored = await db
		.select({ id: schema.categories.id, name: schema.categories.name })
		.from(schema.categories);

	return new Map(stored.map((category) => [category.name, category.id]));
}

/** Jobs split across the demo employers so home cards are not all one company. */
const employerEmailByJobId: Record<string, string> = {
	'20000000-0000-4000-8000-000000000003': 'studyhub@internery.local',
	'20000000-0000-4000-8000-000000000010': 'studyhub@internery.local',
	'20000000-0000-4000-8000-000000000011': 'studyhub@internery.local',
	'20000000-0000-4000-8000-000000000023': 'studyhub@internery.local',
	'20000000-0000-4000-8000-000000000004': 'eventcrew@internery.local',
	'20000000-0000-4000-8000-000000000015': 'eventcrew@internery.local',
	'20000000-0000-4000-8000-000000000020': 'eventcrew@internery.local',
	'20000000-0000-4000-8000-000000000025': 'eventcrew@internery.local',
	'20000000-0000-4000-8000-000000000032': 'eventcrew@internery.local'
};

async function seedJobRows(
	userIdsByEmail: Map<string, string>,
	categoryIdsByName: Map<string, string>,
	locationIdsByName: Map<string, string>
) {
	const hour = 60 * 60 * 1000;

	for (const [index, job] of seedJobs.entries()) {
		const categoryId = categoryIdsByName.get(job.categoryName);
		const locationId = locationIdsByName.get(job.location);
		const employerId = requireUserId(
			userIdsByEmail,
			employerEmailByJobId[job.id] ?? 'employer@internery.local'
		);

		if (!categoryId) {
			throw new Error(`Missing category ${job.categoryName}.`);
		}

		if (!locationId) {
			throw new Error(`Missing location ${job.location}.`);
		}

		const isCompleted = job.status === 'COMPLETED';

		// Stagger creation times so the cards show "Just now", "3 hours ago", ...
		// instead of every job looking identical. The last fixed id is the newest.
		const createdAt = new Date(Date.now() - (seedJobs.length - 1 - index) * 3 * hour);

		const values = {
			employerId,
			categoryId,
			title: job.title,
			description: job.description,
			locationId,
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
			createdAt,
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

	const categoryIdsByName = await seedCategoryRows();
	const locationIdsByName = await seedLocationRows();
	await seedJobRows(userIdsByEmail, categoryIdsByName, locationIdsByName);
	await seedApplicationRows(userIdsByEmail);
	await seedReviewRows(userIdsByEmail);
	await seedWorkRecordRows(userIdsByEmail);
	await seedNotificationRows(userIdsByEmail);
	await seedReportRows(userIdsByEmail);

	console.log('Seed complete.');
	console.log(`  users: ${seedUsers.length}`);
	console.log(`  locations: ${seedLocations.length}`);
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
