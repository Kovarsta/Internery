import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** POST /me/notifications/{notificationId}/read — markNotificationRead */
export const POST: RequestHandler = () => notImplemented();
