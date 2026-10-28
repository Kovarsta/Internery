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
export type JobStatus = 'HIRING' | 'FILLED' | 'COMPLETED' | 'CANCELLED';

export type JobSummarySource = {
	id: string;
	title: string;
	location: string;
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
	location: string;
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

/** Maps a user and their optional common profile to the public account shape. */
export function toUserMe(user: UserMeSource, profile: UserProfileSource): UserMe {
	let avatarUrl = user.image ?? null;

	if (profile?.avatarKey) {
		avatarUrl = `/api/v1/users/${user.id}/avatar`;
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
		location: job.location,
		salaryAmount: job.salaryAmount,
		salaryType: job.salaryType,
		startDate: job.startDate,
		endDate: job.endDate,
		positionsNeeded: job.positionsNeeded,
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
