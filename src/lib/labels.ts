import type { ApplicationStatus, JobStatus } from '#lib/api/types.ts';

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
	FILLED: 'Filled',
	COMPLETED: 'Completed',
	CANCELLED: 'Cancelled'
};

/** Badge classes for job states, using the app palette. */
export const jobStatusClass: Record<JobStatus, string> = {
	HIRING: 'bg-chalk/10 text-chalk',
	FILLED: 'bg-highlight/20 text-ink',
	COMPLETED: 'bg-muted text-muted-foreground',
	CANCELLED: 'bg-warning/10 text-warning'
};
