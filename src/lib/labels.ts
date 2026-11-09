import type {
	AccountStatus,
	ApplicationStatus,
	EmployerVerification,
	JobStatus,
	ModerationCause,
	UserRole,
	VerificationRequestStatus
} from '#lib/api/types.ts';

/** Display labels for application states. */
export const applicationStatusLabel: Record<ApplicationStatus, string> = {
	PENDING: 'Pending',
	ACCEPTED: 'Accepted',
	REJECTED: 'Rejected',
	WITHDRAWN: 'Withdrawn'
};

/** Badge classes for application states, using the app palette. */
export const applicationStatusClass: Record<ApplicationStatus, string> = {
	PENDING: 'bg-highlight/20 text-ink',
	ACCEPTED: 'bg-chalk/10 text-chalk',
	REJECTED: 'bg-warning/10 text-warning',
	WITHDRAWN: 'bg-muted text-muted-foreground'
};

/** Display labels for job states. */
export const jobStatusLabel: Record<JobStatus, string> = {
	HIRING: 'Hiring',
	CLOSED: 'Closed',
	FILLED: 'Filled',
	COMPLETED: 'Completed',
	CANCELLED: 'Cancelled'
};

/** Badge classes for job states, using the app palette. */
export const jobStatusClass: Record<JobStatus, string> = {
	HIRING: 'bg-chalk/10 text-chalk',
	CLOSED: 'bg-highlight/20 text-ink',
	FILLED: 'bg-highlight/20 text-ink',
	COMPLETED: 'bg-muted text-muted-foreground',
	CANCELLED: 'bg-warning/10 text-warning'
};

/** Display labels for employer verification states. */
export const verificationStatusLabel: Record<EmployerVerification, string> = {
	UNVERIFIED: 'Unverified',
	PENDING: 'Pending review',
	VERIFIED: 'Verified',
	REJECTED: 'Rejected'
};

/** Badge classes for employer verification states, using the app palette. */
export const verificationStatusClass: Record<EmployerVerification, string> = {
	UNVERIFIED: 'bg-muted text-muted-foreground',
	PENDING: 'bg-highlight/20 text-ink',
	VERIFIED: 'bg-chalk/10 text-chalk',
	REJECTED: 'bg-warning/10 text-warning'
};

/** Display labels for account states. */
export const accountStatusLabel: Record<AccountStatus, string> = {
	PENDING_VERIFICATION: 'Unverified',
	ACTIVE: 'Active',
	SUSPENDED: 'Suspended',
	LOCKED: 'Locked',
	DELETED: 'Deleted'
};

/** Badge classes for account states, using the app palette. */
export const accountStatusClass: Record<AccountStatus, string> = {
	PENDING_VERIFICATION: 'bg-highlight/20 text-ink',
	ACTIVE: 'bg-chalk/10 text-chalk',
	SUSPENDED: 'bg-warning/10 text-warning',
	LOCKED: 'bg-warning/10 text-warning',
	DELETED: 'bg-muted text-muted-foreground'
};

/** Display labels for user roles. */
export const userRoleLabel: Record<UserRole, string> = {
	STUDENT: 'Student',
	EMPLOYER: 'Employer',
	ADMIN: 'Admin'
};

/** Display labels for moderation causes. */
export const moderationCauseLabel: Record<ModerationCause, string> = {
	REPORTED: 'Reported',
	AUTO_HIDDEN: 'Auto-hidden',
	ADMIN_HIDDEN: 'Hidden by admin',
	SCAM_FLAG: 'Scam keywords'
};

/** Badge classes for moderation causes. */
export const moderationCauseClass: Record<ModerationCause, string> = {
	REPORTED: 'bg-warning/10 text-warning',
	AUTO_HIDDEN: 'bg-warning/10 text-warning',
	ADMIN_HIDDEN: 'bg-muted text-muted-foreground',
	SCAM_FLAG: 'bg-highlight/20 text-ink'
};

/** Display labels for verification request states. */
export const verificationRequestStatusLabel: Record<VerificationRequestStatus, string> = {
	PENDING: 'Pending',
	APPROVED: 'Approved',
	REJECTED: 'Rejected'
};

/** Badge classes for verification request states. */
export const verificationRequestStatusClass: Record<VerificationRequestStatus, string> = {
	PENDING: 'bg-highlight/20 text-ink',
	APPROVED: 'bg-chalk/10 text-chalk',
	REJECTED: 'bg-warning/10 text-warning'
};
