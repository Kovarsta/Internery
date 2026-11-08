/**
 * Notification email senders.
 *
 * Services insert notifications inside a transaction, then call
 * `sendNotificationEmails` with those rows after it commits. This module owns
 * the mapping from a notification type to an email: the link, the action label
 * and the copy. It never decides whether an event happened; the service does.
 */
import { inArray } from 'drizzle-orm';
import { ORIGIN } from '$app/env/private';
import { users } from '#lib/server/db/auth.schema.ts';
import type { Database } from '#lib/server/db/types.ts';
import { sendEmail, type EmailContent } from '#lib/server/email.ts';
import type { NotificationInsert } from '#lib/server/services/notifications.ts';

type NotificationEmailSender = (to: string, notification: NotificationInsert) => Promise<void>;

/**
 * Emails everyone in a just-committed notification batch.
 *
 * Call it after the transaction, never inside it. Delivery failures are logged
 * and never thrown, so an email outage cannot undo the database action. Skipped
 * in tests, where no provider should be contacted.
 */
export async function sendNotificationEmails(
	database: Database,
	pending: NotificationInsert[]
): Promise<void> {
	if (pending.length === 0 || process.env.NODE_ENV === 'test') {
		return;
	}

	try {
		const userIds = [...new Set(pending.map((notification) => notification.userId))];

		const recipients = await database
			.select({ id: users.id, email: users.email })
			.from(users)
			.where(inArray(users.id, userIds));

		const emailByUserId = new Map(recipients.map((user) => [user.id, user.email]));

		for (const notification of pending) {
			const email = emailByUserId.get(notification.userId);

			if (!email) {
				continue;
			}

			try {
				await sendNotificationEmail(email, notification);
			} catch (error) {
				console.error(`Could not send the ${notification.type} email to ${email}:`, error);
			}
		}
	} catch (error) {
		console.error('Could not load notification email recipients:', error);
	}
}

/**
 * Sends one notification as an email.
 *
 * Kept separate from the batch so a caller that already has one recipient and
 * one row can use it directly.
 */
export async function sendNotificationEmail(
	to: string,
	notification: NotificationInsert
): Promise<void> {
	await notificationSenders[notification.type](to, notification);
}

/**
 * One sender per email shape.
 *
 * Types that share copy and a destination share a sender. A new notification
 * type needs one entry here; a type that needs its own copy gets its own
 * function in this file.
 */
const notificationSenders: Record<NotificationInsert['type'], NotificationEmailSender> = {
	APPLICATION_RECEIVED: sendApplicantActivityEmail,
	APPLICATION_WITHDRAWN: sendApplicantActivityEmail,
	APPLICATION_ACCEPTED: sendApplicationDecisionEmail,
	APPLICATION_REJECTED: sendApplicationDecisionEmail,
	JOB_FILLED: sendJobStatusEmail,
	JOB_COMPLETED: sendJobStatusEmail,
	JOB_CANCELLED: sendJobStatusEmail,
	JOB_HIDDEN: sendJobModerationEmail,
	JOB_AUTO_HIDDEN: sendJobModerationEmail,
	VERIFICATION_APPROVED: sendVerificationDecisionEmail,
	VERIFICATION_REJECTED: sendVerificationDecisionEmail,
	REVIEW_RECEIVED: sendReviewEmail,
	WORK_RECORD_CREATED: sendWorkRecordEmail
};

function sendApplicantActivityEmail(to: string, notification: NotificationInsert): Promise<void> {
	const path = notification.jobId
		? `/employer/jobs/${notification.jobId}/applicants`
		: '/employer/jobs';

	return sendFromNotification(to, notification, 'View applicants', path);
}

function sendApplicationDecisionEmail(to: string, notification: NotificationInsert): Promise<void> {
	return sendFromNotification(to, notification, 'View your applications', '/me/applications');
}

function sendJobStatusEmail(to: string, notification: NotificationInsert): Promise<void> {
	const path = notification.jobId ? `/jobs/${notification.jobId}` : '/jobs';

	return sendFromNotification(to, notification, 'View the job', path);
}

function sendJobModerationEmail(to: string, notification: NotificationInsert): Promise<void> {
	return sendFromNotification(to, notification, 'Open your jobs', '/employer/jobs');
}

function sendVerificationDecisionEmail(
	to: string,
	notification: NotificationInsert
): Promise<void> {
	if (notification.type === 'VERIFICATION_APPROVED') {
		return sendFromNotification(to, notification, 'View your profile', '/employer/profile');
	}

	return sendFromNotification(to, notification, 'View your request', '/me/verification');
}

function sendReviewEmail(to: string, notification: NotificationInsert): Promise<void> {
	// The reviewee can be a student or an employer, so the account hub is the
	// only link that works for both roles.
	return sendFromNotification(to, notification, 'View your account', '/me');
}

function sendWorkRecordEmail(to: string, notification: NotificationInsert): Promise<void> {
	return sendFromNotification(to, notification, 'View your work records', '/me/work-records');
}

/** Builds the shared envelope from a notification row and one link. */
function sendFromNotification(
	to: string,
	notification: NotificationInsert,
	actionLabel: string,
	path: string
): Promise<void> {
	const origin = ORIGIN.replace(/\/$/, '');

	const content: EmailContent = {
		subject: notification.title,
		heading: notification.title,
		body: notification.body ?? 'Open Internery to see the details.',
		actionLabel,
		actionUrl: `${origin}${path}`
	};

	return sendEmail(to, content);
}
