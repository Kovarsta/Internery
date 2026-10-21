import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /me/notifications — listNotifications */
export const GET: RequestHandler = () => notImplemented();
