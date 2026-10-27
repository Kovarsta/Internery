import { describe, expect, it } from 'vitest';
import { toCategory, toUserMe, type UserMeSource } from './mappers.ts';

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
