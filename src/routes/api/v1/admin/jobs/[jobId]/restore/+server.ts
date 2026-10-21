import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** POST /admin/jobs/{jobId}/restore — adminRestoreJob */
export const POST: RequestHandler = () => notImplemented();
