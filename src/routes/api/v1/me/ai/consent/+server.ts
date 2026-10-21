import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /me/ai/consent — getAiConsent */
export const GET: RequestHandler = () => notImplemented();

/** PUT /me/ai/consent — setAiConsent */
export const PUT: RequestHandler = () => notImplemented();
