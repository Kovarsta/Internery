import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** POST /jobs/{jobId}/complete — completeJob */
export const POST: RequestHandler = () => notImplemented();
