import { describe, expect, it } from 'vitest';
import {
	toCategory,
	toEmployerProfile,
	toNotification,
	toStudentProfile,
	toUserMe,
	type EmployerProfileSource,
	type NotificationSource,
	type StudentProfileSource,
	type UserMeSource
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
