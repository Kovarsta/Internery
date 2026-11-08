import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationInsert } from './services/notifications.ts';

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));

vi.mock('#lib/server/email.ts', () => ({ sendEmail }));

import { sendNotificationEmail } from './email-notifications.ts';

describe('sendNotificationEmail', () => {
	beforeEach(() => {
		sendEmail.mockReset();
	});

	it('links an employer to the applicants page', async () => {
		await sendNotificationEmail(
			'employer@example.com',
			notification({ type: 'APPLICATION_RECEIVED', jobId: 'job-1' })
		);

		expect(sendEmail).toHaveBeenCalledWith(
			'employer@example.com',
			expect.objectContaining({
				actionLabel: 'View applicants',
				actionUrl: 'http://localhost:3000/employer/jobs/job-1/applicants'
			})
		);
	});

	it('links an application decision to the student applications page', async () => {
		await sendNotificationEmail(
			'student@example.com',
			notification({ type: 'APPLICATION_ACCEPTED', jobId: 'job-1' })
		);

		expect(sendEmail).toHaveBeenCalledWith(
			'student@example.com',
			expect.objectContaining({
				actionLabel: 'View your applications',
				actionUrl: 'http://localhost:3000/me/applications'
			})
		);
	});

	it('uses the account hub for a review, because either role can receive one', async () => {
		await sendNotificationEmail(
			'reviewee@example.com',
			notification({ type: 'REVIEW_RECEIVED', jobId: 'job-1' })
		);

		expect(sendEmail).toHaveBeenCalledWith(
			'reviewee@example.com',
			expect.objectContaining({
				actionLabel: 'View your account',
				actionUrl: 'http://localhost:3000/me'
			})
		);
	});
});

function notification(overrides: Partial<NotificationInsert>): NotificationInsert {
	return {
		userId: 'user-1',
		type: 'APPLICATION_ACCEPTED',
		title: 'Update',
		...overrides
	};
}
