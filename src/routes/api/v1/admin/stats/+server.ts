import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /admin/stats — adminStats */
export const GET: RequestHandler = () => notImplemented();
