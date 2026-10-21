import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** POST /admin/verification-requests/{requestId}/approve — adminApproveVerification */
export const POST: RequestHandler = () => notImplemented();
