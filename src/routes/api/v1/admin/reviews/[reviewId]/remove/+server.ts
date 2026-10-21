import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** POST /admin/reviews/{reviewId}/remove — adminRemoveReview */
export const POST: RequestHandler = () => notImplemented();
