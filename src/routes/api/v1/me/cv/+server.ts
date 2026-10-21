import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** PUT /me/cv — uploadCv */
export const PUT: RequestHandler = () => notImplemented();

/** GET /me/cv — downloadOwnCv */
export const GET: RequestHandler = () => notImplemented();

/** DELETE /me/cv — deleteCv */
export const DELETE: RequestHandler = () => notImplemented();
