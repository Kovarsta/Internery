import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** POST /jobs/{jobId}/cancel — cancelJob */
export const POST: RequestHandler = () => notImplemented();
