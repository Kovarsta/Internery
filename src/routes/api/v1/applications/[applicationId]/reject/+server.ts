import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** POST /applications/{applicationId}/reject — rejectApplication */
export const POST: RequestHandler = () => notImplemented();
