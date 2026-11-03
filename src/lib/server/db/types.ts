import type { db } from './index.ts';

/** The shared Drizzle client passed to service functions. */
export type Database = typeof db;

/**
 * A transaction handle on the shared client.
 *
 * Service functions that must read, write and audit atomically take this type:
 * the caller opens the transaction, and the function never commits on its own.
 */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
