import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /admin/moderation-queue — adminModerationQueue */
export const GET: RequestHandler = () => notImplemented();
