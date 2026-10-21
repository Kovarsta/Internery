import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** POST /me/notifications/read-all — markAllNotificationsRead */
export const POST: RequestHandler = () => notImplemented();
