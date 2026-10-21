import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /jobs/{jobId} — getJob */
export const GET: RequestHandler = () => notImplemented();

/** PATCH /jobs/{jobId} — updateJob */
export const PATCH: RequestHandler = () => notImplemented();

/** DELETE /jobs/{jobId} — deleteJob */
export const DELETE: RequestHandler = () => notImplemented();
