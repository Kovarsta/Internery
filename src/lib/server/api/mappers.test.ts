import { describe, expect, it } from 'vitest';
import {
	toApplication,
	toCategory,
	toEmployerProfile,
	toJobDetail,
	toJobSummary,
	toMyJob,
	toNotification,
	toReview,
	toStudentProfile,
	toUserMe,
	toVerificationRequest,
	toWorkRecord,
	toWorkRecordCard,
	type ApplicationSource,
	type EmployerProfileSource,
	type JobDetailSource,
	type JobSummarySource,
	type MyJobSource,
	type NotificationSource,
	type ReviewSource,
	type StudentProfileSource,
	type UserMeSource,
	type VerificationRequestSource,
	type WorkRecordSource
} from './mappers.ts';

const user: UserMeSource = {
	id: '8f14e45f-ceea-4f15-9c0f-2d1d3e5c9a11',
	email: 'student@example.com',
	name: 'Student',
	role: 'STUDENT',
	status: 'ACTIVE',
	image: null,
	createdAt: new Date('2026-01-01T00:00:00Z')
};

describe('toUserMe', () => {
	it('maps a user without a profile', () => {
		expect(toUserMe(user, null)).toEqual({
			id: user.id,
			email: user.email,
			role: 'STUDENT',
			status: 'ACTIVE',
			fullName: 'Student',
			phone: null,
			avatarUrl: null,
			createdAt: '2026-01-01T00:00:00.000Z'
		});
	});

	it('prefers an uploaded avatar over the provider image', () => {
		const result = toUserMe(
			{ ...user, image: 'https://example.com/avatar.png' },
			{ phone: '0900000000', avatarKey: 'avatars/student.png' }
		);

		expect(result.avatarUrl).toBe(`/api/v1/users/${user.id}/avatar`);
		expect(result.phone).toBe('0900000000');
	});

	it('falls back to the provider image', () => {
		const result = toUserMe({ ...user, image: 'https://example.com/avatar.png' }, null);

		expect(result.avatarUrl).toBe('https://example.com/avatar.png');
	});
});

describe('toCategory', () => {
	it('returns only the public fields', () => {
		const row = {
			id: 'a3f1c9d0-7fd0-4f6e-9e1a-8a2b4c6d8e0f',
			name: 'Retail',
			isActive: true,
			createdAt: new Date('2026-01-01T00:00:00Z')
		};

		expect(toCategory(row)).toEqual({
			id: 'a3f1c9d0-7fd0-4f6e-9e1a-8a2b4c6d8e0f',
			name: 'Retail',
			isActive: true
		});
	});
});

describe('toJobSummary', () => {
	const job: JobSummarySource = {
		id: '5f0f2f5e-3a0b-4b0e-9f5a-1c2d3e4f5a6b',
		title: 'Part-time barista',
		location: 'Hanoi',
		salaryAmount: 30_000,
		salaryType: 'HOURLY',
		startDate: '2026-11-01',
		endDate: '2026-11-30',
		positionsNeeded: 2,
		acceptedCount: 1,
		status: 'HIRING',
		needsReview: false,
		createdAt: new Date('2026-10-28T08:00:00Z'),
		categoryId: '6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
		categoryName: 'Food & Beverage',
		employerId: '7b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
		employerOrgName: 'Acme Coffee',
		employerOrgType: 'COMPANY',
		employerVerificationStatus: 'VERIFIED',
		employerRatingAvg: 4.5,
		employerRatingCount: 2
	};

	it('maps the summary and derives remaining positions', () => {
		expect(toJobSummary(job)).toEqual({
			id: job.id,
			title: 'Part-time barista',
			category: { id: job.categoryId, name: 'Food & Beverage' },
			location: 'Hanoi',
			salaryAmount: 30_000,
			salaryType: 'HOURLY',
			startDate: '2026-11-01',
			endDate: '2026-11-30',
			positionsNeeded: 2,
			positionsRemaining: 1,
			status: 'HIRING',
			employer: {
				userId: job.employerId,
				orgName: 'Acme Coffee',
				orgType: 'COMPANY',
				verified: true,
				ratingAvg: 4.5,
				ratingCount: 2
			},
			scamWarning: false,
			createdAt: '2026-10-28T08:00:00.000Z'
		});
	});

	it('uses employer defaults when the profile is missing', () => {
		const summary = toJobSummary({
			...job,
			employerOrgName: null,
			employerOrgType: null,
			employerVerificationStatus: null,
			employerRatingAvg: null,
			employerRatingCount: null
		});

		expect(summary.employer).toEqual({
			userId: job.employerId,
			orgName: '',
			orgType: 'INDIVIDUAL',
			verified: false,
			ratingAvg: 0,
			ratingCount: 0
		});
	});

	it('never returns a negative remaining count', () => {
		expect(toJobSummary({ ...job, acceptedCount: 3 }).positionsRemaining).toBe(0);
	});
});

describe('toApplication', () => {
	const application: ApplicationSource = {
		id: '8a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
		jobId: '9b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
		jobTitle: 'Part-time barista',
		employerOrgName: 'Acme Coffee',
		employerUserName: 'Tran Thi Binh',
		status: 'PENDING',
		message: 'I can start next week.',
		rejectReason: null,
		cvKey: 'cv/student.pdf',
		createdAt: new Date('2026-10-01T08:00:00Z'),
		decidedAt: null
	};

	it('maps the student application shape', () => {
		expect(toApplication(application)).toEqual({
			id: application.id,
			jobId: application.jobId,
			jobTitle: 'Part-time barista',
			employerName: 'Acme Coffee',
			status: 'PENDING',
			message: 'I can start next week.',
			rejectReason: null,
			hasCv: true,
			createdAt: '2026-10-01T08:00:00.000Z',
			decidedAt: null
		});
	});

	it('falls back to the employer user name without a profile', () => {
		expect(toApplication({ ...application, employerOrgName: null }).employerName).toBe(
			'Tran Thi Binh'
		);
	});

	it('derives hasCv and keeps the decision fields', () => {
		const decided = toApplication({
			...application,
			status: 'REJECTED',
			rejectReason: 'The position was filled.',
			cvKey: null,
			decidedAt: new Date('2026-10-02T09:00:00Z')
		});

		expect(decided.hasCv).toBe(false);
		expect(decided.rejectReason).toBe('The position was filled.');
		expect(decided.decidedAt).toBe('2026-10-02T09:00:00.000Z');
	});
});

describe('toNotification', () => {
	const notification: NotificationSource = {
		id: 'b7c2e4a1-3d5f-4a8b-9c1d-2e3f4a5b6c7d',
		type: 'APPLICATION_ACCEPTED',
		title: 'Your application was accepted',
		body: null,
		jobId: null,
		applicationId: null,
		readAt: null,
		createdAt: new Date('2026-02-01T09:30:00Z')
	};

	it('returns the public shape with an ISO timestamp', () => {
		expect(toNotification(notification)).toEqual({
			id: 'b7c2e4a1-3d5f-4a8b-9c1d-2e3f4a5b6c7d',
			type: 'APPLICATION_ACCEPTED',
			title: 'Your application was accepted',
			body: null,
			jobId: null,
			applicationId: null,
			read: false,
			createdAt: '2026-02-01T09:30:00.000Z'
		});
	});

	it('derives read from readAt', () => {
		expect(toNotification(notification).read).toBe(false);

		const read = toNotification({ ...notification, readAt: new Date('2026-02-02T10:00:00Z') });

		expect(read.read).toBe(true);
	});
});

describe('toStudentProfile', () => {
	const profile: StudentProfileSource = {
		university: 'VNU',
		major: 'Computer Science',
		skills: ['TypeScript', 'SQL'],
		availability: 'Weekday evenings',
		bio: null,
		cvKey: 'cv/student.pdf',
		cvFileName: 'cv.pdf',
		cvMimeType: 'application/pdf',
		cvSizeBytes: 1024,
		ratingAvg: 4.5,
		ratingCount: 3
	};

	it('returns empty fields before the profile is created', () => {
		expect(toStudentProfile(null, user)).toEqual({
			userId: user.id,
			fullName: 'Student',
			university: '',
			major: '',
			skills: [],
			availability: null,
			bio: null,
			cv: null,
			ratingAvg: 0,
			ratingCount: 0
		});
	});

	it('maps the stored profile and its CV', () => {
		expect(toStudentProfile(profile, user)).toEqual({
			userId: user.id,
			fullName: 'Student',
			university: 'VNU',
			major: 'Computer Science',
			skills: ['TypeScript', 'SQL'],
			availability: 'Weekday evenings',
			bio: null,
			cv: {
				fileName: 'cv.pdf',
				mimeType: 'application/pdf',
				sizeBytes: 1024
			},
			ratingAvg: 4.5,
			ratingCount: 3
		});
	});

	it('treats an incomplete CV row as absent', () => {
		const incomplete = { ...profile, cvMimeType: null };

		expect(toStudentProfile(incomplete, user).cv).toBeNull();
	});
});

describe('toEmployerProfile', () => {
	const profile: EmployerProfileSource = {
		orgName: 'Acme',
		orgType: 'COMPANY',
		description: null,
		address: null,
		contactPhone: '0900000000',
		verificationStatus: 'VERIFIED',
		ratingAvg: 4,
		ratingCount: 2
	};

	it('returns empty fields before the profile is created', () => {
		expect(toEmployerProfile(null, user.id)).toEqual({
			userId: user.id,
			orgName: '',
			orgType: 'INDIVIDUAL',
			description: null,
			address: null,
			contactPhone: null,
			verificationStatus: 'UNVERIFIED',
			ratingAvg: 0,
			ratingCount: 0
		});
	});

	it('maps the stored profile', () => {
		expect(toEmployerProfile(profile, user.id)).toEqual({
			userId: user.id,
			orgName: 'Acme',
			orgType: 'COMPANY',
			description: null,
			address: null,
			contactPhone: '0900000000',
			verificationStatus: 'VERIFIED',
			ratingAvg: 4,
			ratingCount: 2
		});
	});
});

const job: JobSummarySource = {
	id: '5f0f2f5e-3a0b-4b0e-9f5a-1c2d3e4f5a6b',
	title: 'Part-time barista',
	location: 'Hanoi',
	salaryAmount: 30_000,
	salaryType: 'HOURLY',
	startDate: '2026-11-01',
	endDate: '2026-11-30',
	positionsNeeded: 2,
	acceptedCount: 1,
	status: 'HIRING',
	needsReview: false,
	createdAt: new Date('2026-10-28T08:00:00Z'),
	categoryId: '6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
	categoryName: 'Food & Beverage',
	employerId: '7b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
	employerOrgName: 'Acme Coffee',
	employerOrgType: 'COMPANY',
	employerVerificationStatus: 'VERIFIED',
	employerRatingAvg: 4.5,
	employerRatingCount: 2
};

describe('toMyJob', () => {
	const myJob: MyJobSource = {
		...job,
		applicantCount: 4,
		isHidden: false,
		hiddenReason: null
	};

	it('adds the employer counts to the summary', () => {
		expect(toMyJob(myJob)).toEqual({
			...toJobSummary(job),
			applicantCount: 4,
			acceptedCount: 1,
			isHidden: false,
			hiddenReason: null
		});
	});

	it('keeps the moderation state of a hidden job', () => {
		const hidden = toMyJob({ ...myJob, isHidden: true, hiddenReason: 'Reported by 3 students' });

		expect(hidden.isHidden).toBe(true);
		expect(hidden.hiddenReason).toBe('Reported by 3 students');
	});
});

describe('toJobDetail', () => {
	const detail: JobDetailSource = {
		...job,
		description: 'Serve coffee on weekends.',
		schedule: 'Saturday and Sunday, 8:00-12:00',
		isHidden: false
	};

	it('adds the long-form fields and the accepting flag', () => {
		expect(toJobDetail(detail, null)).toEqual({
			...toJobSummary(job),
			description: 'Serve coffee on weekends.',
			schedule: 'Saturday and Sunday, 8:00-12:00',
			acceptingApplications: true
		});
	});

	it('reports that a closed job no longer accepts applications', () => {
		expect(toJobDetail({ ...detail, status: 'FILLED' }, null).acceptingApplications).toBe(false);
	});

	it('adds the student fields only for a student viewer', () => {
		const application: ApplicationSource = {
			id: '8a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
			jobId: job.id,
			jobTitle: job.title,
			employerOrgName: 'Acme Coffee',
			employerUserName: 'Tran Thi Binh',
			status: 'PENDING',
			message: null,
			rejectReason: null,
			cvKey: null,
			createdAt: new Date('2026-10-01T08:00:00Z'),
			decidedAt: null
		};

		const mapped = toJobDetail(detail, {
			saved: true,
			myApplication: toApplication(application)
		});

		expect(mapped.saved).toBe(true);
		expect(mapped.myApplication?.status).toBe('PENDING');
	});

	it('omits the student fields for other viewers', () => {
		const mapped = toJobDetail(detail, null);

		expect(mapped).not.toHaveProperty('saved');
		expect(mapped).not.toHaveProperty('myApplication');
	});
});

describe('toReview', () => {
	const review: ReviewSource = {
		id: '9b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
		jobId: job.id,
		reviewerId: '0c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f',
		reviewerName: 'Tran Thi Binh',
		rating: 4,
		comment: 'Reliable and on time.',
		createdAt: new Date('2026-12-01T08:00:00Z')
	};

	it('nests the reviewer and formats the timestamp', () => {
		expect(toReview(review)).toEqual({
			id: review.id,
			jobId: review.jobId,
			reviewer: {
				id: '0c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f',
				fullName: 'Tran Thi Binh'
			},
			rating: 4,
			comment: 'Reliable and on time.',
			createdAt: '2026-12-01T08:00:00.000Z'
		});
	});
});

const workRecord: WorkRecordSource = {
	id: 'a1b2c3d4-0000-4000-8000-000000000001',
	payload: {
		recordId: 'a1b2c3d4-0000-4000-8000-000000000001',
		studentName: 'Le Van An',
		employerName: 'Acme Coffee',
		jobTitle: 'Part-time barista',
		startDate: '2026-01-05',
		endDate: '2026-02-28',
		rating: 5,
		comment: null,
		issuedAt: '2026-03-01T09:00:00.000Z'
	},
	isPublic: true,
	publishedAt: new Date('2026-03-02T09:00:00Z')
};

describe('toWorkRecordCard', () => {
	it('maps the signed payload and not the joined tables', () => {
		expect(toWorkRecordCard(workRecord)).toEqual({
			id: workRecord.id,
			studentName: 'Le Van An',
			employerName: 'Acme Coffee',
			jobTitle: 'Part-time barista',
			startDate: '2026-01-05',
			endDate: '2026-02-28',
			rating: 5,
			comment: null,
			issuedAt: '2026-03-01T09:00:00.000Z'
		});
	});
});

describe('toWorkRecord', () => {
	it('adds the public state and a shareable verify link', () => {
		const record = toWorkRecord(workRecord, 'http://localhost:5173');

		expect(record.isPublic).toBe(true);
		expect(record.publishedAt).toBe('2026-03-02T09:00:00.000Z');
		expect(record.verifyUrl).toBe(
			'http://localhost:5173/api/v1/work-records/a1b2c3d4-0000-4000-8000-000000000001/verify'
		);
	});

	it('keeps a private record without a publication date', () => {
		const record = toWorkRecord({ ...workRecord, isPublic: false, publishedAt: null }, 'http://x');

		expect(record.isPublic).toBe(false);
		expect(record.publishedAt).toBeNull();
	});
});

describe('toVerificationRequest', () => {
	const request: VerificationRequestSource = {
		id: 'b2c3d4e5-1111-4000-8000-000000000002',
		employerId: user.id,
		orgName: 'Acme Coffee',
		websiteUrl: null,
		contactInfo: 'owner@acme.example',
		licenseKey: 'licenses/acme.pdf',
		status: 'PENDING',
		rejectReason: null,
		createdAt: new Date('2026-10-01T08:00:00Z'),
		reviewedAt: null
	};

	it('reports the licence presence without exposing a link', () => {
		expect(toVerificationRequest(request)).toEqual({
			id: request.id,
			employerId: user.id,
			orgName: 'Acme Coffee',
			websiteUrl: null,
			contactInfo: 'owner@acme.example',
			hasLicense: true,
			licenseUrl: null,
			status: 'PENDING',
			rejectReason: null,
			createdAt: '2026-10-01T08:00:00.000Z',
			reviewedAt: null
		});
	});

	it('maps a reviewed request without a licence', () => {
		const reviewed = toVerificationRequest({
			...request,
			licenseKey: null,
			status: 'REJECTED',
			rejectReason: 'The licence was illegible.',
			reviewedAt: new Date('2026-10-03T08:00:00Z')
		});

		expect(reviewed.hasLicense).toBe(false);
		expect(reviewed.rejectReason).toBe('The licence was illegible.');
		expect(reviewed.reviewedAt).toBe('2026-10-03T08:00:00.000Z');
	});
});
