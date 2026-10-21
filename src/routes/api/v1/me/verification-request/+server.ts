import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /me/verification-request — getMyVerificationRequest */
export const GET: RequestHandler = () => notImplemented();

/** POST /me/verification-request — submitVerificationRequest */
export const POST: RequestHandler = () => notImplemented();
