import { relations, sql } from 'drizzle-orm';
import {
	boolean,
	check,
	date,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	primaryKey,
	smallint,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';

import { users } from './auth.schema.ts';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const pk = () => uuid().primaryKey().defaultRandom();
const ts = () => timestamp({ withTimezone: true });
const createdAt = () => ts().notNull().defaultNow();
const updatedAt = () =>
	ts()
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date());

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const orgType = pgEnum('org_type', ['COMPANY', 'INDIVIDUAL']);
export const employerVerification = pgEnum('employer_verification', [
	'UNVERIFIED',
	'PENDING',
	'VERIFIED',
	'REJECTED'
]);
export const salaryType = pgEnum('salary_type', ['HOURLY', 'DAILY', 'FIXED']);
export const jobStatus = pgEnum('job_status', ['HIRING', 'FILLED', 'COMPLETED', 'CANCELLED']);
export const applicationStatus = pgEnum('application_status', [
	'PENDING',
	'ACCEPTED',
	'REJECTED',
	'WITHDRAWN'
]);
export const verificationRequestStatus = pgEnum('verification_request_status', [
	'PENDING',
	'APPROVED',
	'REJECTED'
]);
export const reportStatus = pgEnum('report_status', ['OPEN', 'RESOLVED']);
export const aiVerdict = pgEnum('ai_verdict', ['FIT', 'MAYBE_FIT']);
export const notificationType = pgEnum('notification_type', [
	'APPLICATION_RECEIVED', // to employer (US-12)
	'APPLICATION_WITHDRAWN', // to employer (US-14)
	'APPLICATION_ACCEPTED', // to student (US-24)
	'APPLICATION_REJECTED', // to student (US-24)
	'JOB_FILLED', // to student (US-30: tin doi trang thai)
	'JOB_COMPLETED',
	'JOB_CANCELLED',
	'JOB_HIDDEN', // admin hide, with reason (US-32)
	'JOB_AUTO_HIDDEN', // 3 distinct reporters (US-42)
	'VERIFICATION_APPROVED', // (US-40)
	'VERIFICATION_REJECTED',
	'REVIEW_RECEIVED',
	'WORK_RECORD_CREATED' // (US-44)
]);

/* ------------------------------------------------------------------ */
/* User-owned profile and moderation data                              */
/* ------------------------------------------------------------------ */

/**
 * Common profile fields that are not part of Better Auth's user model.
 *
 * Role-specific data lives in `student_profiles` and `employer_profiles`.
 */
export const userProfiles = pgTable('user_profiles', {
	userId: uuid()
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	phone: varchar({ length: 20 }),
	avatarKey: text(), // storage key, never the file itself
	updatedAt: updatedAt()
});

/**
 * Auth-adjacent moderation state kept out of Better Auth's generated schema.
 *
 * A temporary lockout (`lockedUntil`) is separate from an admin lock
 * (`lockedAt`, `lockedBy`, `lockReason`).
 */
export const userModeration = pgTable(
	'user_moderation',
	{
		userId: uuid()
			.primaryKey()
			.references(() => users.id, { onDelete: 'cascade' }),
		failedLoginCount: integer().notNull().default(0),
		lockedUntil: ts(),
		lockedAt: ts(),
		lockedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
		lockReason: varchar({ length: 500 }),
		updatedAt: updatedAt()
	},
	(t) => [check('user_moderation_failed_login_chk', sql`${t.failedLoginCount} >= 0`)]
);

/* ------------------------------------------------------------------ */
/* Profiles                                  US-07, US-08, US-16       */
/* ------------------------------------------------------------------ */

export const studentProfiles = pgTable(
	'student_profiles',
	{
		userId: uuid()
			.primaryKey()
			.references(() => users.id, { onDelete: 'cascade' }),
		university: varchar({ length: 160 }),
		major: varchar({ length: 160 }), // also feeds AI suggestions (US-36)
		skills: text()
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`),
		availability: text(), // free text, e.g. "weekday evenings, Sat all day"
		bio: text(),
		// CV (US-08): one current CV per student, max 5 MB, PDF/DOCX
		cvKey: text(),
		cvFileName: varchar({ length: 255 }),
		cvMimeType: varchar({ length: 100 }),
		cvSizeBytes: integer(),
		// Denormalised review summary, recalculated in the review transaction
		ratingAvg: numeric({ precision: 3, scale: 2, mode: 'number' }).notNull().default(0),
		ratingCount: integer().notNull().default(0),
		updatedAt: updatedAt()
	},
	(t) => [
		check(
			'student_cv_size_chk',
			sql`${t.cvSizeBytes} IS NULL OR ${t.cvSizeBytes} BETWEEN 1 AND 5242880`
		),
		check('student_cv_all_or_none_chk', sql`(${t.cvKey} IS NULL) = (${t.cvFileName} IS NULL)`),
		check('student_rating_chk', sql`${t.ratingAvg} BETWEEN 0 AND 5`)
	]
);

export const employerProfiles = pgTable(
	'employer_profiles',
	{
		userId: uuid()
			.primaryKey()
			.references(() => users.id, { onDelete: 'cascade' }),
		orgName: varchar({ length: 200 }).notNull(),
		orgType: orgType().notNull().default('INDIVIDUAL'),
		description: text(),
		address: varchar({ length: 300 }),
		contactPhone: varchar({ length: 20 }),
		// Trust layer (US-39..41). VERIFIED means "reviewed by an admin".
		verificationStatus: employerVerification().notNull().default('UNVERIFIED'),
		verifiedAt: ts(),
		ratingAvg: numeric({ precision: 3, scale: 2, mode: 'number' }).notNull().default(0),
		ratingCount: integer().notNull().default(0),
		updatedAt: updatedAt()
	},
	(t) => [
		index('employer_verification_idx').on(t.verificationStatus),
		check('employer_rating_chk', sql`${t.ratingAvg} BETWEEN 0 AND 5`)
	]
);

/* ------------------------------------------------------------------ */
/* Categories                                US-34                     */
/* ------------------------------------------------------------------ */

export const categories = pgTable(
	'categories',
	{
		id: pk(),
		name: varchar({ length: 100 }).notNull(),
		isActive: boolean().notNull().default(true), // in-use categories are deactivated, never deleted (AC-34.2)
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('categories_name_lower_uq').on(sql`lower(${t.name})`)]
);

/* ------------------------------------------------------------------ */
/* Jobs                                      US-09..11, US-17..20, 25  */
/* ------------------------------------------------------------------ */

export const jobs = pgTable(
	'jobs',
	{
		id: pk(),
		employerId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		categoryId: uuid()
			.notNull()
			.references(() => categories.id, { onDelete: 'restrict' }),
		title: varchar({ length: 200 }).notNull(),
		description: text().notNull(),
		location: varchar({ length: 300 }).notNull(),
		schedule: text().notNull(), // working time, free text for v1
		salaryAmount: integer().notNull(), // VND
		salaryType: salaryType().notNull(),
		startDate: date({ mode: 'string' }).notNull(),
		endDate: date({ mode: 'string' }).notNull(),
		positionsNeeded: integer().notNull().default(1),
		status: jobStatus().notNull().default('HIRING'),
		// Moderation (US-32, US-42, US-43)
		isHidden: boolean().notNull().default(false),
		hiddenReason: varchar({ length: 500 }),
		hiddenBy: uuid().references(() => users.id, { onDelete: 'set null' }), // null when auto-hidden
		hiddenAt: ts(),
		needsReview: boolean().notNull().default(false), // scam keyword flag
		flaggedTerms: text()
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`),
		completedAt: ts(),
		cancelledAt: ts(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		check('jobs_positions_chk', sql`${t.positionsNeeded} >= 1`),
		check('jobs_salary_chk', sql`${t.salaryAmount} > 0`),
		// Spec rule: end_date later than start_date (a 1-day shift would need >= ; see README open questions)
		check('jobs_dates_chk', sql`${t.endDate} > ${t.startDate}`),
		// Full-text search (AC-09.1). 'simple' config: Vietnamese has no stemmer.
		index('jobs_fts_idx').using(
			'gin',
			sql`to_tsvector('simple', ${t.title} || ' ' || ${t.description})`
		),
		// Hot path: the public listing only ever shows open, visible jobs
		index('jobs_open_listing_idx')
			.on(t.createdAt.desc())
			.where(sql`${t.status} = 'HIRING' AND NOT ${t.isHidden}`),
		index('jobs_open_salary_idx')
			.on(t.salaryAmount)
			.where(sql`${t.status} = 'HIRING' AND NOT ${t.isHidden}`),
		index('jobs_category_idx').on(t.categoryId),
		index('jobs_employer_status_idx').on(t.employerId, t.status),
		index('jobs_needs_review_idx')
			.on(t.createdAt)
			.where(sql`${t.needsReview} OR ${t.isHidden}`)
	]
);

/* ------------------------------------------------------------------ */
/* Applications                              US-12..14, US-21..24      */
/* ------------------------------------------------------------------ */

export const applications = pgTable(
	'applications',
	{
		id: pk(),
		jobId: uuid()
			.notNull()
			.references(() => jobs.id, { onDelete: 'cascade' }),
		studentId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		message: varchar({ length: 1000 }),
		// Snapshot of the CV at apply time, so replacing/deleting the profile CV
		// later does not break old applications. Do not delete the file while referenced.
		cvKey: text(),
		cvFileName: varchar({ length: 255 }),
		status: applicationStatus().notNull().default('PENDING'),
		rejectReason: varchar({ length: 500 }),
		decidedAt: ts(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		// AC-12.3: no duplicate applications
		unique('applications_job_student_uq').on(t.jobId, t.studentId),
		index('applications_student_idx').on(t.studentId, t.createdAt.desc()),
		index('applications_job_status_idx').on(t.jobId, t.status)
	]
);

/* ------------------------------------------------------------------ */
/* Reviews                                   US-26..28, US-33          */
/* ------------------------------------------------------------------ */

export const reviews = pgTable(
	'reviews',
	{
		id: pk(),
		jobId: uuid()
			.notNull()
			.references(() => jobs.id, { onDelete: 'restrict' }),
		reviewerId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		revieweeId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		rating: smallint().notNull(),
		comment: varchar({ length: 500 }),
		// US-33: removed reviews stay in the table but are excluded from display and averages
		isHidden: boolean().notNull().default(false),
		hiddenBy: uuid().references(() => users.id, { onDelete: 'set null' }),
		hiddenAt: ts(),
		createdAt: createdAt()
	},
	(t) => [
		// One review per person per job (AC-26.2 / AC-27.2)
		unique('reviews_job_reviewer_reviewee_uq').on(t.jobId, t.reviewerId, t.revieweeId),
		check('reviews_rating_chk', sql`${t.rating} BETWEEN 1 AND 5`),
		check('reviews_not_self_chk', sql`${t.reviewerId} <> ${t.revieweeId}`),
		index('reviews_reviewee_idx')
			.on(t.revieweeId, t.createdAt.desc())
			.where(sql`NOT ${t.isHidden}`)
		// SERVICE INVARIANT: job.status = 'COMPLETED' and reviewer/reviewee are the
		// employer and an ACCEPTED student of that job.
	]
);

/* ------------------------------------------------------------------ */
/* Notifications / saved jobs                US-15, US-29              */
/* ------------------------------------------------------------------ */

export const notifications = pgTable(
	'notifications',
	{
		id: pk(),
		userId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: notificationType().notNull(),
		title: varchar({ length: 200 }).notNull(),
		body: text(),
		jobId: uuid().references(() => jobs.id, { onDelete: 'set null' }),
		applicationId: uuid().references(() => applications.id, { onDelete: 'set null' }),
		readAt: ts(),
		createdAt: createdAt()
	},
	(t) => [
		index('notifications_user_idx').on(t.userId, t.createdAt.desc()),
		// fast unread badge count (AC-29.1)
		index('notifications_unread_idx')
			.on(t.userId)
			.where(sql`${t.readAt} IS NULL`)
	]
);

export const savedJobs = pgTable(
	'saved_jobs',
	{
		userId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		jobId: uuid()
			.notNull()
			.references(() => jobs.id, { onDelete: 'cascade' }),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.userId, t.jobId] })]
);

/* ================================================================== */
/* OPTIONAL EXTRAS (Could): trust layer, work records, AI              */
/* ================================================================== */

/** US-39 / US-40. At most one PENDING request per employer (AC-39.2). */
export const verificationRequests = pgTable(
	'verification_requests',
	{
		id: pk(),
		employerId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		orgName: varchar({ length: 200 }).notNull(),
		websiteUrl: varchar({ length: 500 }),
		contactInfo: varchar({ length: 300 }).notNull(),
		licenseKey: text(), // optional business license, storage key
		status: verificationRequestStatus().notNull().default('PENDING'),
		rejectReason: varchar({ length: 500 }),
		reviewedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
		reviewedAt: ts(),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('verification_one_pending_uq')
			.on(t.employerId)
			.where(sql`${t.status} = 'PENDING'`),
		index('verification_status_idx').on(t.status, t.createdAt)
	]
);

/** US-42. One report per student per job; 3 distinct reporters auto-hide the job (FR-49). */
export const reports = pgTable(
	'reports',
	{
		id: pk(),
		jobId: uuid()
			.notNull()
			.references(() => jobs.id, { onDelete: 'cascade' }),
		reporterId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		reason: varchar({ length: 500 }).notNull(),
		status: reportStatus().notNull().default('OPEN'),
		resolvedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
		resolvedAt: ts(),
		createdAt: createdAt()
	},
	(t) => [
		unique('reports_job_reporter_uq').on(t.jobId, t.reporterId), // AC-42.2
		index('reports_job_status_idx').on(t.jobId, t.status)
	]
);

/** What gets signed into a work record. Keep this shape stable (signatureVersion). */
export type WorkRecordPayload = {
	recordId: string;
	studentName: string;
	employerName: string;
	jobTitle: string;
	startDate: string; // YYYY-MM-DD
	endDate: string;
	rating: number; // 1..5, employer's rating of the student
	comment: string | null;
	issuedAt: string; // ISO timestamp
};

/** US-44..46. Created in the same transaction as the employer's review of the student. */
export const workRecords = pgTable(
	'work_records',
	{
		id: pk(),
		jobId: uuid()
			.notNull()
			.references(() => jobs.id, { onDelete: 'restrict' }),
		studentId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		employerId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		reviewId: uuid()
			.notNull()
			.references(() => reviews.id, { onDelete: 'restrict' }),
		payload: jsonb().$type<WorkRecordPayload>().notNull(),
		signature: text().notNull(), // HMAC-SHA256 over canonical JSON of payload (NFR-28)
		signatureVersion: smallint().notNull().default(1),
		isPublic: boolean().notNull().default(false), // private by default (AC-45.1)
		publishedAt: ts(),
		createdAt: createdAt()
	},
	(t) => [
		unique('work_records_job_student_uq').on(t.jobId, t.studentId),
		index('work_records_student_idx').on(t.studentId, t.createdAt.desc()),
		index('work_records_directory_idx')
			.on(t.publishedAt.desc())
			.where(sql`${t.isPublic}`),
		check('work_records_public_chk', sql`NOT ${t.isPublic} OR ${t.publishedAt} IS NOT NULL`)
	]
);

/** US-38. A row exists once the student has ever decided; withdrawnAt IS NULL means consent is active. */
export const aiConsents = pgTable('ai_consents', {
	studentId: uuid()
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	consentedAt: ts().notNull().defaultNow(),
	withdrawnAt: ts()
});

export type AiReason = { text: string; cvQuote: string };

/** US-37 cache (AC-37.4). Deleted when consent is withdrawn (AC-38.3). */
export const aiExplanations = pgTable(
	'ai_explanations',
	{
		id: pk(),
		studentId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		jobId: uuid()
			.notNull()
			.references(() => jobs.id, { onDelete: 'cascade' }),
		cvHash: varchar({ length: 64 }).notNull(), // sha-256 hex of the extracted CV text
		verdict: aiVerdict().notNull(),
		reasons: jsonb().$type<AiReason[]>().notNull(), // only quotes verified against the CV (AC-37.2)
		gaps: text()
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`),
		model: varchar({ length: 100 }).notNull(),
		createdAt: createdAt()
	},
	(t) => [unique('ai_explanations_uq').on(t.studentId, t.jobId, t.cvHash)]
);

/** NFR-25: max 10 AI calls per user per day. Upsert-increment inside the request. */
export const aiUsage = pgTable(
	'ai_usage',
	{
		userId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		day: date({ mode: 'string' }).notNull(),
		count: integer().notNull().default(0)
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.day] }),
		check('ai_usage_count_chk', sql`${t.count} >= 0`)
	]
);

/* ------------------------------------------------------------------ */
/* Audit log                                 US-31, US-32, US-33, 40   */
/* ------------------------------------------------------------------ */

export const auditLogs = pgTable(
	'audit_logs',
	{
		id: pk(),
		actorId: uuid().references(() => users.id, { onDelete: 'set null' }), // null = system
		action: varchar({ length: 60 }).notNull(), // e.g. USER_LOCKED, JOB_HIDDEN, REVIEW_REMOVED
		targetType: varchar({ length: 40 }).notNull(),
		targetId: uuid().notNull(),
		metadata: jsonb().$type<Record<string, unknown>>(),
		createdAt: createdAt()
	},
	(t) => [
		index('audit_target_idx').on(t.targetType, t.targetId),
		index('audit_created_idx').on(t.createdAt.desc())
	]
);

/* ------------------------------------------------------------------ */
/* Relations (for db.query.*)                                          */
/* ------------------------------------------------------------------ */

export const usersProductRelations = relations(users, ({ one, many }) => ({
	profile: one(userProfiles, {
		fields: [users.id],
		references: [userProfiles.userId]
	}),
	moderation: one(userModeration, {
		fields: [users.id],
		references: [userModeration.userId]
	}),
	moderatedUsers: many(userModeration, { relationName: 'moderationActor' }),
	studentProfile: one(studentProfiles, {
		fields: [users.id],
		references: [studentProfiles.userId]
	}),
	employerProfile: one(employerProfiles, {
		fields: [users.id],
		references: [employerProfiles.userId]
	}),
	jobs: many(jobs),
	applications: many(applications),
	notifications: many(notifications),
	savedJobs: many(savedJobs),
	reviewsWritten: many(reviews, { relationName: 'reviewer' }),
	reviewsReceived: many(reviews, { relationName: 'reviewee' }),
	workRecordsAsStudent: many(workRecords, { relationName: 'workRecordStudent' }),
	workRecordsAsEmployer: many(workRecords, { relationName: 'workRecordEmployer' }),
	verificationRequestsSubmitted: many(verificationRequests, {
		relationName: 'verificationEmployer'
	}),
	verificationRequestsReviewed: many(verificationRequests, {
		relationName: 'verificationReviewer'
	}),
	reportsFiled: many(reports, { relationName: 'reportReporter' }),
	reportsResolved: many(reports, { relationName: 'reportResolver' }),
	auditLogs: many(auditLogs)
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
	user: one(users, { fields: [userProfiles.userId], references: [users.id] })
}));

export const userModerationRelations = relations(userModeration, ({ one }) => ({
	user: one(users, { fields: [userModeration.userId], references: [users.id] }),
	lockedBy: one(users, {
		fields: [userModeration.lockedBy],
		references: [users.id],
		relationName: 'moderationActor'
	})
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one }) => ({
	user: one(users, { fields: [studentProfiles.userId], references: [users.id] })
}));

export const employerProfilesRelations = relations(employerProfiles, ({ one }) => ({
	user: one(users, { fields: [employerProfiles.userId], references: [users.id] })
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
	jobs: many(jobs)
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
	employer: one(users, { fields: [jobs.employerId], references: [users.id] }),
	category: one(categories, { fields: [jobs.categoryId], references: [categories.id] }),
	applications: many(applications),
	reports: many(reports),
	workRecords: many(workRecords),
	savedBy: many(savedJobs)
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
	job: one(jobs, { fields: [applications.jobId], references: [jobs.id] }),
	student: one(users, { fields: [applications.studentId], references: [users.id] }),
	notifications: many(notifications)
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
	job: one(jobs, { fields: [reviews.jobId], references: [jobs.id] }),
	reviewer: one(users, {
		fields: [reviews.reviewerId],
		references: [users.id],
		relationName: 'reviewer'
	}),
	reviewee: one(users, {
		fields: [reviews.revieweeId],
		references: [users.id],
		relationName: 'reviewee'
	}),
	workRecord: one(workRecords, {
		fields: [reviews.id],
		references: [workRecords.reviewId]
	})
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
	user: one(users, { fields: [notifications.userId], references: [users.id] }),
	job: one(jobs, { fields: [notifications.jobId], references: [jobs.id] }),
	application: one(applications, {
		fields: [notifications.applicationId],
		references: [applications.id]
	})
}));

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
	user: one(users, { fields: [savedJobs.userId], references: [users.id] }),
	job: one(jobs, { fields: [savedJobs.jobId], references: [jobs.id] })
}));

export const verificationRequestsRelations = relations(verificationRequests, ({ one }) => ({
	employer: one(users, {
		fields: [verificationRequests.employerId],
		references: [users.id],
		relationName: 'verificationEmployer'
	}),
	reviewer: one(users, {
		fields: [verificationRequests.reviewedBy],
		references: [users.id],
		relationName: 'verificationReviewer'
	})
}));

export const reportsRelations = relations(reports, ({ one }) => ({
	job: one(jobs, { fields: [reports.jobId], references: [jobs.id] }),
	reporter: one(users, {
		fields: [reports.reporterId],
		references: [users.id],
		relationName: 'reportReporter'
	}),
	resolver: one(users, {
		fields: [reports.resolvedBy],
		references: [users.id],
		relationName: 'reportResolver'
	})
}));

export const workRecordsRelations = relations(workRecords, ({ one }) => ({
	job: one(jobs, { fields: [workRecords.jobId], references: [jobs.id] }),
	student: one(users, {
		fields: [workRecords.studentId],
		references: [users.id],
		relationName: 'workRecordStudent'
	}),
	employer: one(users, {
		fields: [workRecords.employerId],
		references: [users.id],
		relationName: 'workRecordEmployer'
	}),
	review: one(reviews, { fields: [workRecords.reviewId], references: [reviews.id] })
}));

export const aiConsentsRelations = relations(aiConsents, ({ one }) => ({
	student: one(users, { fields: [aiConsents.studentId], references: [users.id] })
}));

export const aiExplanationsRelations = relations(aiExplanations, ({ one }) => ({
	student: one(users, { fields: [aiExplanations.studentId], references: [users.id] }),
	job: one(jobs, { fields: [aiExplanations.jobId], references: [jobs.id] })
}));

export const aiUsageRelations = relations(aiUsage, ({ one }) => ({
	user: one(users, { fields: [aiUsage.userId], references: [users.id] })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
	actor: one(users, { fields: [auditLogs.actorId], references: [users.id] })
}));

/* ------------------------------------------------------------------ */
/* Inferred row types                                                  */
/* ------------------------------------------------------------------ */

export type UserProfile = typeof userProfiles.$inferSelect;
export type UserModeration = typeof userModeration.$inferSelect;
export type StudentProfile = typeof studentProfiles.$inferSelect;
export type EmployerProfile = typeof employerProfiles.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type WorkRecord = typeof workRecords.$inferSelect;
