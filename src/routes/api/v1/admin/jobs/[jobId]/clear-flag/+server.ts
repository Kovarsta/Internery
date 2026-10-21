import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** POST /admin/jobs/{jobId}/clear-flag — adminClearJobFlag */
export const POST: RequestHandler = () => notImplemented();
