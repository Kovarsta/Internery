import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** POST /jobs/{jobId}/applications — applyToJob */
export const POST: RequestHandler = () => notImplemented();

/** GET /jobs/{jobId}/applications — listJobApplications */
export const GET: RequestHandler = () => notImplemented();
