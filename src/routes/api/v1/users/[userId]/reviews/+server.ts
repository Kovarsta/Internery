import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /users/{userId}/reviews — listUserReviews */
export const GET: RequestHandler = () => notImplemented();
