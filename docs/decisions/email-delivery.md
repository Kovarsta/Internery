# Email delivery

Date: 2026-11-09

## Context

The app sends Better Auth verification mail and creates an in-app notification for every
application, job, moderation and review event. Before this decision, only verification mail existed;
event notifications stayed inside the app.

The demo needs the same events by email, without letting a provider outage break a database action,
and without an email queue or worker.

## Decision

### One sender, one template

- `src/lib/server/email.ts` exposes `sendEmail(to, content)`. It is the only code that talks to
  Resend.
- `src/lib/server/email-template.ts` renders the HTML and text parts. It is pure, so the preview
  script and unit tests use the same template as production.
- `sendVerificationEmail` and `sendPasswordResetEmail` use the same base and template.

The design is a card on the app's paper background: brand line, heading, body, one green action
button, and a footer. Styles are inline and laid out with presentation tables because email clients
strip `<style>` and handle modern layout inconsistently.

### Every notification also sends an email

`src/lib/server/email-notifications.ts` maps each `notification_type` to an email sender and
destination:

| Notification types                              | Email destination                                    |
| ----------------------------------------------- | ---------------------------------------------------- |
| `APPLICATION_RECEIVED`, `APPLICATION_WITHDRAWN` | employer applicants page                             |
| `APPLICATION_ACCEPTED`, `APPLICATION_REJECTED`  | student applications page                            |
| `JOB_FILLED`, `JOB_COMPLETED`, `JOB_CANCELLED`  | job detail                                           |
| `JOB_HIDDEN`, `JOB_AUTO_HIDDEN`                 | employer jobs page                                   |
| `VERIFICATION_APPROVED`                         | employer profile                                     |
| `VERIFICATION_REJECTED`                         | verification page                                    |
| `REVIEW_RECEIVED`                               | account hub, because either role can be the reviewee |
| `WORK_RECORD_CREATED`                           | work records page                                    |

The email subject and heading are the notification title; the body is the notification body or a
short fallback. A new notification type needs one entry in the sender map; a type that needs
different copy gets its own sender in the same file.

### After commit, failures logged

Services collect the notification rows they inserted, then call
`sendNotificationEmails(database, pending)` **after** the transaction commits. Delivery failures are
logged and never thrown, so an email outage cannot undo an acceptance or fail the request. Tests skip
the provider entirely.

### Configuration

`RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` are required. The sender must use the
`Name <email@example.com>` form when a display name is present; Resend rejects
`Name email@example.com`. `EMAIL_FROM_ADDRESS` also feeds verification and password-reset mail.

### Password reset

Better Auth owns the one-time token and calls `sendResetPassword` when a reset is requested. The
callback builds the app URL and sends it with `sendPasswordResetEmail`; it does not await the
provider, so response timing does not reveal whether an address exists. A completed reset revokes
the account's other sessions.

## Trade-offs

- **No outbox or retry.** A failed send is lost after the log line. If delivery must be guaranteed,
  add an outbox table and a worker.
- **No preferences.** Every notification emails; users cannot opt out yet.
- **Two emails for one review.** An employer reviewing a student creates `REVIEW_RECEIVED` and
  `WORK_RECORD_CREATED`, so the student receives two messages. They can be merged later.
- **Resend only.** The local demo needs a real key and verified sender. A Mailpit/SMTP adapter is the
  alternative if the demo must work offline.
- **Links use `ORIGIN`.** Emails generated in a local demo point at `http://localhost:3000`.
