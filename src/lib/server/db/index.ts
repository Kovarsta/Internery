import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { DATABASE_URL } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

/**
 * The connection pool, kept across Vite module reloads.
 *
 * The dev server re-evaluates this module on every edit. A new `postgres()` per
 * reload leaves the previous pool's connections open, and a long session
 * exhausts Postgres with "too many clients already". Reusing one pool from
 * `globalThis` keeps the connection count stable. A production process loads
 * this module once, so it fills the same slot the first time.
 */
const globalForDatabase = globalThis as typeof globalThis & {
	interneryDatabaseClient?: ReturnType<typeof postgres>;
};

const client = globalForDatabase.interneryDatabaseClient ?? postgres(DATABASE_URL);

globalForDatabase.interneryDatabaseClient = client;

export const db = drizzle(client, { schema });
