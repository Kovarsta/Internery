import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** POST /admin/jobs/{jobId}/hide — adminHideJob */
export const POST: RequestHandler = () => notImplemented();
