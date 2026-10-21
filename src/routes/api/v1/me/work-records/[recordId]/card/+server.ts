import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /me/work-records/{recordId}/card — downloadWorkRecordCard */
export const GET: RequestHandler = () => notImplemented();
