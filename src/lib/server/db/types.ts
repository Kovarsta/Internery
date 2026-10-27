import type { db } from './index.ts';

/** The shared Drizzle client passed to service functions. */
export type Database = typeof db;
