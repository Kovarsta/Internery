import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /applications/{applicationId}/student-profile — getApplicantProfile */
export const GET: RequestHandler = () => notImplemented();
