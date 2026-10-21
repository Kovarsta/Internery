import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** PATCH /admin/categories/{categoryId} — adminUpdateCategory */
export const PATCH: RequestHandler = () => notImplemented();

/** DELETE /admin/categories/{categoryId} — adminDeleteCategory */
export const DELETE: RequestHandler = () => notImplemented();
