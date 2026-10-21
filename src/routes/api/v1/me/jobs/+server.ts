import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /me/jobs — listMyJobs */
export const GET: RequestHandler = () => notImplemented();
