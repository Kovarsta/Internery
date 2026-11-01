import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** PUT /me/avatar — uploadAvatar */
export const PUT: RequestHandler = () => notImplemented();

/** DELETE /me/avatar — deleteAvatar */
export const DELETE: RequestHandler = () => notImplemented();
