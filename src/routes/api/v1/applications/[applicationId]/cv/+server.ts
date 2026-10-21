import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /applications/{applicationId}/cv — downloadApplicationCv */
export const GET: RequestHandler = () => notImplemented();
