import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /me — getMe */
export const GET: RequestHandler = () => notImplemented();

/** PATCH /me — updateMe */
export const PATCH: RequestHandler = () => notImplemented();
