import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** POST /me/email-change/confirm — confirmEmailChange */
export const POST: RequestHandler = () => notImplemented();
