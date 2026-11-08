/** Response shapes the demo pages consume. Keep them aligned with `openapi.yaml`. */

import type { DayOfWeek } from '#lib/schedule.ts';

export type PageMeta = {
	page: number;
	pageSize: number;
	total: number;
};

export type Paged<T> = PageMeta & {
	items: T[];
};

export type Category = {
	id: string;
	name: string;
	isActive: boolean;
};

export type Location = {
	id: string;
	name: string;
	displayName: string;
	countryCode: string;
	countryName: string;
	isRemote: boolean;
};

export type SalaryType = 'HOURLY' | 'DAILY' | 'FIXED';

export type JobStatus = 'HIRING' | 'FILLED' | 'COMPLETED' | 'CANCELLED';

export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export type UserRole = 'STUDENT' | 'EMPLOYER' | 'ADMIN';

export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'LOCKED' | 'DELETED';

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

export type JobSummary = {
	id: string;
	title: string;
	category: { id: string; name: string };
	locationId: string;
	location: string;
	/** Read-only summary derived from the structured schedule. */
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
		orgType: 'COMPANY' | 'INDIVIDUAL';
		verified: boolean;
		ratingAvg: number;
		ratingCount: number;
	};
	scamWarning: boolean;
	createdAt: string;
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
	/** True when the student already reviewed the employer for this job. */
	hasReviewed: boolean;
	createdAt: string;
	decidedAt: string | null;
};

export type JobDetail = JobSummary & {
	description: string;
	scheduleNote: string | null;
	acceptingApplications: boolean;
	saved?: boolean;
	myApplication?: Application | null;
};

export type MyJob = JobSummary & {
	applicantCount: number;
	acceptedCount: number;
	isHidden: boolean;
	hiddenReason: string | null;
};

/** An applicant as the employer sees them, without the full profile. */
export type Applicant = {
	id: string;
	status: ApplicationStatus;
	message: string | null;
	hasCv: boolean;
	/** True when the employer already reviewed this student for this job. */
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

export type CvInfo = {
	fileName: string;
	mimeType: string;
	sizeBytes: number;
};

export type OrgType = 'COMPANY' | 'INDIVIDUAL';

export type EmployerVerification = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

/** The employer profile the owner edits on `/me/company-profile`. */
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

/** The full student profile an employer sees for one application. */
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

export type NotificationType =
	| 'APPLICATION_RECEIVED'
	| 'APPLICATION_WITHDRAWN'
	| 'APPLICATION_ACCEPTED'
	| 'APPLICATION_REJECTED'
	| 'JOB_FILLED'
	| 'JOB_COMPLETED'
	| 'JOB_CANCELLED'
	| 'JOB_HIDDEN'
	| 'JOB_AUTO_HIDDEN'
	| 'VERIFICATION_APPROVED'
	| 'VERIFICATION_REJECTED'
	| 'REVIEW_RECEIVED'
	| 'WORK_RECORD_CREATED';

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

/** One public card in the work-record directory. */
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

/** A student's own record, including its publish state and verify link. */
export type WorkRecord = WorkRecordCard & {
	isPublic: boolean;
	publishedAt: string | null;
	verifyUrl: string;
};

/** The signature check for one public record. */
export type VerifyResult = {
	valid: boolean;
	record: WorkRecordCard | null;
};

export type VerificationRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** One account in the admin user list, including its lock state. */
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

/** Why a job sits in the moderation queue; one job can have several reasons. */
export type ModerationCause = 'REPORTED' | 'AUTO_HIDDEN' | 'ADMIN_HIDDEN' | 'SCAM_FLAG';

/** One job needing admin attention. */
export type ModerationItem = {
	job: JobSummary;
	isHidden: boolean;
	hiddenReason: string | null;
	openReportCount: number;
	flaggedTerms: string[];
	causes: ModerationCause[];
};

/** Platform counts for the admin overview. */
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
		filled: number;
		completed: number;
		cancelled: number;
	};
	applicationsTotal: number;
	completedJobs: number;
};

/** The employer's latest verification request on `/me/verification`. */
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
