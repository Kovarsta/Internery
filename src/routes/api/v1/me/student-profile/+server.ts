import type { RequestHandler } from './$types';
import { notImplemented } from '#lib/server/api/not-implemented.ts';

/** GET /me/student-profile — getStudentProfile */
export const GET: RequestHandler = () => notImplemented();

/** PUT /me/student-profile — saveStudentProfile */
export const PUT: RequestHandler = () => notImplemented();
