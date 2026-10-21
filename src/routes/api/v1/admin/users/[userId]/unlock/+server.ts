import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** POST /admin/users/{userId}/unlock — adminUnlockUser */
export const POST: RequestHandler = () => notImplemented();
