import { isNotNull } from 'drizzle-orm';
import type { Database } from '#lib/server/db/types.ts';
import { applications, studentProfiles, userProfiles } from '#lib/server/db/product.schema.ts';
import type { Storage } from './client.ts';
import { BLANK_AVATAR_KEY } from './keys.ts';

/** Unreferenced files must survive this long before the sweep may delete them. */
export const SWEEP_GRACE_DAYS = 7;

/** Prefixes the sweep owns. `tmp/` is handled by the bucket lifecycle rule. */
const SWEEP_PREFIXES = ['cv/', 'avatars/'];

export type SweepOptions = {
	now?: Date;
	dryRun?: boolean;
};

export type SweepResult = {
	scanned: number;
	deleted: string[];
};

/**
 * Collects every storage key a database row still points at.
 *
 * This is three queries, not one per object. A key can appear in both a profile
 * and an application snapshot, so the results are unioned into one set.
 */
export async function collectReferencedKeys(database: Database): Promise<Set<string>> {
	const [cvKeys, applicationKeys, avatarKeys] = await Promise.all([
		database
			.selectDistinct({ key: studentProfiles.cvKey })
			.from(studentProfiles)
			.where(isNotNull(studentProfiles.cvKey)),
		database
			.selectDistinct({ key: applications.cvKey })
			.from(applications)
			.where(isNotNull(applications.cvKey)),
		database
			.selectDistinct({ key: userProfiles.avatarKey })
			.from(userProfiles)
			.where(isNotNull(userProfiles.avatarKey))
	]);

	const keys = new Set<string>();

	for (const row of [...cvKeys, ...applicationKeys, ...avatarKeys]) {
		if (row.key) {
			keys.add(row.key);
		}
	}

	return keys;
}

/**
 * Deletes bucket objects that no row references and that are older than the
 * grace period.
 *
 * Dry run is the default: nothing is deleted unless `dryRun` is explicitly
 * `false`. The grace period is what makes the sweep safe without locking: a
 * key replaced during an apply is long committed by the time it becomes a
 * candidate.
 *
 * Returns every candidate key, whether or not it was deleted.
 */
export async function sweepOrphanedObjects(
	database: Database,
	storage: Storage,
	options: SweepOptions = {}
): Promise<SweepResult> {
	const now = options.now ?? new Date();
	const dryRun = options.dryRun ?? true;
	const cutoff = new Date(now.getTime() - SWEEP_GRACE_DAYS * 24 * 60 * 60 * 1000);

	const referenced = await collectReferencedKeys(database);
	const deleted: string[] = [];
	let scanned = 0;

	for (const prefix of SWEEP_PREFIXES) {
		let continuationToken: string | null = null;

		do {
			const page = await storage.listObjects(prefix, continuationToken);
			continuationToken = page.nextToken;
			scanned += page.objects.length;

			const orphans = page.objects.filter(
				(object) =>
					object.key !== BLANK_AVATAR_KEY &&
					!referenced.has(object.key) &&
					object.lastModified !== null &&
					object.lastModified < cutoff
			);

			if (orphans.length === 0) {
				continue;
			}

			const keys = orphans.map((object) => object.key);

			if (!dryRun) {
				await storage.deleteObjects(keys);
			}

			deleted.push(...keys);
		} while (continuationToken);
	}

	return { scanned, deleted };
}
