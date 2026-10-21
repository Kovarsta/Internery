import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /me/applications — listMyApplications */
export const GET: RequestHandler = () => notImplemented();
