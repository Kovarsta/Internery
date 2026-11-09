import { createHash } from 'node:crypto';
import type { DayOfWeek } from '#lib/schedule.ts';
import { formatSchedule, toClockTime } from '#lib/schedule.ts';
import type { WorkRecordPayload } from '#lib/server/db/product.schema.ts';
import type { UserRole } from './auth.ts';

export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'LOCKED' | 'DELETED';

export type UserMeSource = {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	status: AccountStatus;
	image?: string | null;
	createdAt: Date | string;
};

export type UserProfileSource = {
	phone: string | null;
	avatarKey: string | null;
} | null;

export type UserMe = {
	id: string;
	email: string;
	role: UserRole;
	status: AccountStatus;
	fullName: string;
	phone: string | null;
	avatarUrl: string | null;
	createdAt: string;
};

export type OrgType = 'COMPANY' | 'INDIVIDUAL';
export type EmployerVerification = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export type CvInfo = {
	fileName: string;
	mimeType: string;
	sizeBytes: number;
};

export type StudentProfileSource = {
	university: string | null;
	major: string | null;
	skills: string[];
	availability: string | null;
	bio: string | null;
	cvKey: string | null;
	cvFileName: string | null;
	cvMimeType: string | null;
	cvSizeBytes: number | null;
	ratingAvg: number;
	ratingCount: number;
};

export type StudentProfile = {
	userId: string;
	fullName: string;
	university: string;
	major: string;
	skills: string[];
	availability: string | null;
	bio: string | null;
	cv: CvInfo | null;
	ratingAvg: number;
	ratingCount: number;
};

export type EmployerProfileSource = {
	orgName: string;
	orgType: OrgType;
	description: string | null;
	address: string | null;
	contactPhone: string | null;
	verificationStatus: EmployerVerification;
	ratingAvg: number;
	ratingCount: number;
};

export type EmployerProfile = {
	userId: string;
	orgName: string;
	orgType: OrgType;
	description: string | null;
	address: string | null;
	contactPhone: string | null;
	verificationStatus: EmployerVerification;
	ratingAvg: number;
	ratingCount: number;
};

export type CategorySource = {
	id: string;
	name: string;
	isActive: boolean;
};

export type Category = {
	id: string;
	name: string;
	isActive: boolean;
};

export type SalaryType = 'HOURLY' | 'DAILY' | 'FIXED';
export type JobStatus = 'HIRING' | 'CLOSED' | 'FILLED' | 'COMPLETED' | 'CANCELLED';
export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export type JobSummarySource = {
	id: string;
	title: string;
	locationId: string;
	location: string;
	daysOfWeek: DayOfWeek[];
	startTime: string;
	endTime: string;
	salaryAmount: number;
	salaryType: SalaryType;
	startDate: string;
	endDate: string;
	positionsNeeded: number;
	acceptedCount: number;
	status: JobStatus;
	needsReview: boolean;
	createdAt: Date | string;
	categoryId: string;
	categoryName: string;
	employerId: string;
	employerOrgName: string | null;
	employerOrgType: OrgType | null;
	employerVerificationStatus: EmployerVerification | null;
	employerRatingAvg: number | null;
	employerRatingCount: number | null;
};

export type JobSummary = {
	id: string;
	title: string;
	category: { id: string; name: string };
	locationId: string;
	location: string;
	schedule: string;
	daysOfWeek: DayOfWeek[];
	startTime: string;
	endTime: string;
	salaryAmount: number;
	salaryType: SalaryType;
	startDate: string;
	endDate: string;
	positionsNeeded: number;
	positionsRemaining: number;
	status: JobStatus;
	employer: {
		userId: string;
		orgName: string;
		orgType: OrgType;
		verified: boolean;
		ratingAvg: number;
		ratingCount: number;
	};
	scamWarning: boolean;
	createdAt: string;
};

export type ApplicationSource = {
	id: string;
	jobId: string;
	jobTitle: string;
	employerOrgName: string | null;
	employerUserName: string;
	status: ApplicationStatus;
	message: string | null;
	rejectReason: string | null;
	cvKey: string | null;
	hasReviewed: boolean;
	createdAt: Date | string;
	decidedAt: Date | null;
};

export type Application = {
	id: string;
	jobId: string;
	jobTitle: string;
	employerName: string;
	status: ApplicationStatus;
	message: string | null;
	rejectReason: string | null;
	hasCv: boolean;
	hasReviewed: boolean;
	createdAt: string;
	decidedAt: string | null;
};

export type ApplicantSource = {
	id: string;
	status: ApplicationStatus;
	message: string | null;
	cvKey: string | null;
	hasReviewed: boolean;
	createdAt: Date | string;
	studentName: string;
	studentUniversity: string | null;
	studentMajor: string | null;
	studentRatingAvg: number | null;
	studentRatingCount: number | null;
};

export type Applicant = {
	id: string;
	status: ApplicationStatus;
	message: string | null;
	hasCv: boolean;
	hasReviewed: boolean;
	createdAt: string;
	student: {
		fullName: string;
		university: string | null;
		major: string | null;
		ratingAvg: number;
		ratingCount: number;
	};
};

export type MyJobSource = JobSummarySource & {
	applicantCount: number;
	isHidden: boolean;
	hiddenReason: string | null;
};

export type MyJob = JobSummary & {
	applicantCount: number;
	acceptedCount: number;
	isHidden: boolean;
	hiddenReason: string | null;
};

export type JobDetailSource = JobSummarySource & {
	description: string;
	scheduleNote: string | null;
	isHidden: boolean;
};

export type JobDetail = JobSummary & {
	description: string;
	scheduleNote: string | null;
	acceptingApplications: boolean;
	saved?: boolean;
	myApplication?: Application | null;
};

export type ReviewSource = {
	id: string;
	jobId: string;
	reviewerId: string;
	reviewerName: string;
	rating: number;
	comment: string | null;
	createdAt: Date | string;
};

export type Review = {
	id: string;
	jobId: string;
	reviewer: { id: string; fullName: string };
	rating: number;
	comment: string | null;
	createdAt: string;
};

export type WorkRecordCardSource = {
	id: string;
	payload: WorkRecordPayload;
};

export type WorkRecordCard = {
	id: string;
	studentName: string;
	employerName: string;
	jobTitle: string;
	startDate: string;
	endDate: string;
	rating: number;
	comment: string | null;
	issuedAt: string;
};

export type WorkRecordSource = WorkRecordCardSource & {
	isPublic: boolean;
	publishedAt: Date | null;
};

export type WorkRecord = WorkRecordCard & {
	isPublic: boolean;
	publishedAt: string | null;
	verifyUrl: string;
};

export type VerificationRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type VerificationRequestSource = {
	id: string;
	employerId: string;
	orgName: string;
	websiteUrl: string | null;
	contactInfo: string;
	licenseKey: string | null;
	status: VerificationRequestStatus;
	rejectReason: string | null;
	createdAt: Date | string;
	reviewedAt: Date | null;
};

export type VerificationRequest = {
	id: string;
	employerId: string;
	orgName: string;
	websiteUrl: string | null;
	contactInfo: string;
	hasLicense: boolean;
	licenseUrl: string | null;
	status: VerificationRequestStatus;
	rejectReason: string | null;
	createdAt: string;
	reviewedAt: string | null;
};

export type NotificationType =
	| 'APPLICATION_RECEIVED'
	| 'APPLICATION_WITHDRAWN'
	| 'APPLICATION_ACCEPTED'
	| 'APPLICATION_REJECTED'
	| 'JOB_FILLED'
	| 'JOB_CLOSED'
	| 'JOB_COMPLETED'
	| 'JOB_CANCELLED'
	| 'JOB_HIDDEN'
	| 'JOB_AUTO_HIDDEN'
	| 'VERIFICATION_APPROVED'
	| 'VERIFICATION_REJECTED'
	| 'REVIEW_RECEIVED'
	| 'WORK_RECORD_CREATED';

export type NotificationSource = {
	id: string;
	type: NotificationType;
	title: string;
	body: string | null;
	jobId: string | null;
	applicationId: string | null;
	readAt: Date | null;
	createdAt: Date | string;
};

export type Notification = {
	id: string;
	type: NotificationType;
	title: string;
	body: string | null;
	jobId: string | null;
	applicationId: string | null;
	read: boolean;
	createdAt: string;
};

/**
 * Short, stable version for a storage key.
 *
 * Every upload gets a new key, so the hash changes with the picture. That is
 * what lets the avatar route cache immutably: a new image always means a new
 * URL, so a cached copy can never be stale.
 */
function avatarVersion(key: string): string {
	return createHash('sha256').update(key).digest('hex').slice(0, 8);
}

/** Maps a user and their optional common profile to the public account shape. */
export function toUserMe(user: UserMeSource, profile: UserProfileSource): UserMe {
	let avatarUrl = user.image ?? null;

	if (profile?.avatarKey) {
		avatarUrl = `/api/v1/users/${user.id}/avatar?v=${avatarVersion(profile.avatarKey)}`;
	}

	return {
		id: user.id,
		email: user.email,
		role: user.role,
		status: user.status,
		fullName: user.name,
		phone: profile?.phone ?? null,
		avatarUrl,
		createdAt: toIsoString(user.createdAt)
	};
}

/** Maps a category row to the public category shape. */
export function toCategory(category: CategorySource): Category {
	return {
		id: category.id,
		name: category.name,
		isActive: category.isActive
	};
}

/** Maps a job projection row to the public summary shape. */
export function toJobSummary(job: JobSummarySource): JobSummary {
	return {
		id: job.id,
		title: job.title,
		category: {
			id: job.categoryId,
			name: job.categoryName
		},
		locationId: job.locationId,
		location: job.location,
		schedule: formatSchedule(job.daysOfWeek, job.startTime, job.endTime),
		daysOfWeek: job.daysOfWeek,
		startTime: toClockTime(job.startTime),
		endTime: toClockTime(job.endTime),
		salaryAmount: job.salaryAmount,
		salaryType: job.salaryType,
		startDate: job.startDate,
		endDate: job.endDate,
		positionsNeeded: job.positionsNeeded,
		// An edit can lower `positionsNeeded` below the accepted count, and the
		// contract forbids a negative remaining count.
		positionsRemaining: Math.max(job.positionsNeeded - job.acceptedCount, 0),
		status: job.status,
		employer: {
			userId: job.employerId,
			orgName: job.employerOrgName ?? '',
			orgType: job.employerOrgType ?? 'INDIVIDUAL',
			verified: job.employerVerificationStatus === 'VERIFIED',
			ratingAvg: job.employerRatingAvg ?? 0,
			ratingCount: job.employerRatingCount ?? 0
		},
		scamWarning: job.needsReview,
		createdAt: toIsoString(job.createdAt)
	};
}

/** Maps an employer's own job row to the shape with applicant counts. */
export function toMyJob(job: MyJobSource): MyJob {
	return {
		...toJobSummary(job),
		applicantCount: job.applicantCount,
		acceptedCount: job.acceptedCount,
		isHidden: job.isHidden,
		hiddenReason: job.hiddenReason
	};
}

/**
 * Maps a job row to the detail shape.
 *
 * `student` is null for anonymous visitors and non-students. The student-only
 * fields are then left out rather than filled with misleading defaults.
 */
export function toJobDetail(
	job: JobDetailSource,
	student: { saved: boolean; myApplication: Application | null } | null
): JobDetail {
	const detail: JobDetail = {
		...toJobSummary(job),
		description: job.description,
		scheduleNote: job.scheduleNote,
		acceptingApplications: job.status === 'HIRING'
	};

	if (student !== null) {
		detail.saved = student.saved;
		detail.myApplication = student.myApplication;
	}

	return detail;
}

/** Maps an application projection to the student's public application shape. */
export function toApplication(application: ApplicationSource): Application {
	return {
		id: application.id,
		jobId: application.jobId,
		jobTitle: application.jobTitle,
		employerName: application.employerOrgName ?? application.employerUserName,
		status: application.status,
		message: application.message,
		rejectReason: application.rejectReason,
		hasCv: application.cvKey !== null,
		hasReviewed: application.hasReviewed,
		createdAt: toIsoString(application.createdAt),
		decidedAt: application.decidedAt === null ? null : toIsoString(application.decidedAt)
	};
}

/** Maps an applicant projection to the employer's applicant shape. */
export function toApplicant(applicant: ApplicantSource): Applicant {
	return {
		id: applicant.id,
		status: applicant.status,
		message: applicant.message,
		hasCv: applicant.cvKey !== null,
		hasReviewed: applicant.hasReviewed,
		createdAt: toIsoString(applicant.createdAt),
		student: {
			fullName: applicant.studentName,
			university: applicant.studentUniversity,
			major: applicant.studentMajor,
			// The left join returns nulls when the student never created a profile.
			ratingAvg: applicant.studentRatingAvg ?? 0,
			ratingCount: applicant.studentRatingCount ?? 0
		}
	};
}

/** Maps a review row with its reviewer to the public review shape. */
export function toReview(review: ReviewSource): Review {
	return {
		id: review.id,
		jobId: review.jobId,
		reviewer: {
			id: review.reviewerId,
			fullName: review.reviewerName
		},
		rating: review.rating,
		comment: review.comment,
		createdAt: toIsoString(review.createdAt)
	};
}

/**
 * Maps a work record to the card content.
 *
 * The fields come from the signed payload, not from the joined tables, so what
 * the verify page shows is exactly what was signed.
 */
export function toWorkRecordCard(record: WorkRecordCardSource): WorkRecordCard {
	return {
		id: record.id,
		studentName: record.payload.studentName,
		employerName: record.payload.employerName,
		jobTitle: record.payload.jobTitle,
		startDate: record.payload.startDate,
		endDate: record.payload.endDate,
		rating: record.payload.rating,
		comment: record.payload.comment,
		issuedAt: record.payload.issuedAt
	};
}

/** Maps a work record for its owner, including the shareable verify link. */
export function toWorkRecord(record: WorkRecordSource, origin: string): WorkRecord {
	return {
		...toWorkRecordCard(record),
		isPublic: record.isPublic,
		publishedAt: record.publishedAt === null ? null : toIsoString(record.publishedAt),
		// The verify page reads the JSON endpoint itself; link people to the page
		// so the signature result is explained instead of shown as raw JSON.
		verifyUrl: `${origin}/work-records/${record.id}/verify`
	};
}

/** Maps a verification request for its owner; the licence link is admin-only. */
export function toVerificationRequest(request: VerificationRequestSource): VerificationRequest {
	return {
		id: request.id,
		employerId: request.employerId,
		orgName: request.orgName,
		websiteUrl: request.websiteUrl,
		contactInfo: request.contactInfo,
		hasLicense: request.licenseKey !== null,
		licenseUrl: null,
		status: request.status,
		rejectReason: request.rejectReason,
		createdAt: toIsoString(request.createdAt),
		reviewedAt: request.reviewedAt === null ? null : toIsoString(request.reviewedAt)
	};
}

/** Maps a student profile row, or its absence, to the API shape. */
export function toStudentProfile(
	profile: StudentProfileSource | null,
	user: { id: string; name: string }
): StudentProfile {
	return {
		userId: user.id,
		fullName: user.name,
		university: profile?.university ?? '',
		major: profile?.major ?? '',
		skills: profile?.skills ?? [],
		availability: profile?.availability ?? null,
		bio: profile?.bio ?? null,
		cv: toCvInfo(profile),
		ratingAvg: profile?.ratingAvg ?? 0,
		ratingCount: profile?.ratingCount ?? 0
	};
}

/** Maps an employer profile row, or its absence, to the API shape. */
export function toEmployerProfile(
	profile: EmployerProfileSource | null,
	userId: string
): EmployerProfile {
	return {
		userId,
		orgName: profile?.orgName ?? '',
		orgType: profile?.orgType ?? 'INDIVIDUAL',
		description: profile?.description ?? null,
		address: profile?.address ?? null,
		contactPhone: profile?.contactPhone ?? null,
		verificationStatus: profile?.verificationStatus ?? 'UNVERIFIED',
		ratingAvg: profile?.ratingAvg ?? 0,
		ratingCount: profile?.ratingCount ?? 0
	};
}

/** Maps a notification row to the public shape; `read` is derived from `readAt`. */
export function toNotification(notification: NotificationSource): Notification {
	return {
		id: notification.id,
		type: notification.type,
		title: notification.title,
		body: notification.body,
		jobId: notification.jobId,
		applicationId: notification.applicationId,
		read: notification.readAt !== null,
		createdAt: toIsoString(notification.createdAt)
	};
}

export type AdminUserSource = {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	status: AccountStatus;
	lockedAt: Date | null;
	lockReason: string | null;
	createdAt: Date | string;
};

export type AdminUser = {
	id: string;
	email: string;
	role: UserRole;
	status: AccountStatus;
	fullName: string;
	lockedAt: string | null;
	lockReason: string | null;
	createdAt: string;
};

/** Maps an account row with its moderation fields for the admin list. */
export function toAdminUser(user: AdminUserSource): AdminUser {
	return {
		id: user.id,
		email: user.email,
		role: user.role,
		status: user.status,
		fullName: user.name,
		lockedAt: user.lockedAt === null ? null : toIsoString(user.lockedAt),
		lockReason: user.lockReason,
		createdAt: toIsoString(user.createdAt)
	};
}

export type ModerationCause = 'REPORTED' | 'AUTO_HIDDEN' | 'ADMIN_HIDDEN' | 'SCAM_FLAG';

export type ModerationItemSource = {
	job: JobSummarySource;
	isHidden: boolean;
	hiddenReason: string | null;
	openReportCount: number;
	flaggedTerms: string[];
	causes: ModerationCause[];
};

export type ModerationItem = {
	job: JobSummary;
	isHidden: boolean;
	hiddenReason: string | null;
	openReportCount: number;
	flaggedTerms: string[];
	causes: ModerationCause[];
};

/** Maps a moderation queue row; the job itself uses the public summary shape. */
export function toModerationItem(item: ModerationItemSource): ModerationItem {
	return {
		job: toJobSummary(item.job),
		isHidden: item.isHidden,
		hiddenReason: item.hiddenReason,
		openReportCount: item.openReportCount,
		flaggedTerms: item.flaggedTerms,
		causes: item.causes
	};
}

export type PlatformStatsSource = {
	from: string | null;
	to: string | null;
	students: number;
	employers: number;
	admins: number;
	hiring: number;
	closed: number;
	filled: number;
	completed: number;
	cancelled: number;
	applicationsTotal: number;
	completedJobs: number;
};

export type PlatformStats = {
	from: string | null;
	to: string | null;
	users: {
		students: number;
		employers: number;
		admins: number;
	};
	jobs: {
		hiring: number;
		closed: number;
		filled: number;
		completed: number;
		cancelled: number;
	};
	applicationsTotal: number;
	completedJobs: number;
};

/** Nests the flat count record into the contract's `users` and `jobs` groups. */
export function toPlatformStats(stats: PlatformStatsSource): PlatformStats {
	return {
		from: stats.from,
		to: stats.to,
		users: {
			students: stats.students,
			employers: stats.employers,
			admins: stats.admins
		},
		jobs: {
			hiring: stats.hiring,
			closed: stats.closed,
			filled: stats.filled,
			completed: stats.completed,
			cancelled: stats.cancelled
		},
		applicationsTotal: stats.applicationsTotal,
		completedJobs: stats.completedJobs
	};
}

function toIsoString(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

function toCvInfo(profile: StudentProfileSource | null): CvInfo | null {
	if (!profile?.cvKey) {
		return null;
	}

	// The DB check only ties cvKey to cvFileName. Treat an incomplete CV row as
	// absent rather than returning nulls that the contract does not allow.
	if (!profile.cvFileName || !profile.cvMimeType || profile.cvSizeBytes === null) {
		return null;
	}

	return {
		fileName: profile.cvFileName,
		mimeType: profile.cvMimeType,
		sizeBytes: profile.cvSizeBytes
	};
}
