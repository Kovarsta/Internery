/** Response shapes the demo pages consume. Keep them aligned with `openapi.yaml`. */

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
	createdAt: string;
	decidedAt: string | null;
};

export type JobDetail = JobSummary & {
	description: string;
	schedule: string;
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
