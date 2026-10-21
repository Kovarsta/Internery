import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** PUT /me/saved-jobs/{jobId} — saveJob */
export const PUT: RequestHandler = () => notImplemented();

/** DELETE /me/saved-jobs/{jobId} — unsaveJob */
export const DELETE: RequestHandler = () => notImplemented();
