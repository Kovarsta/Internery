/**
 * Safety check for the database-backed tests.
 *
 * Those tests create real rows (and delete them again). Pointing
 * `TEST_DATABASE_URL` at a development or production database would pollute it,
 * so this setup refuses to start unless the database name contains `test`.
 *
 * The convention is a database such as `internery_test`, created from
 * docker-compose and migrated once. Set `ALLOW_NON_TEST_DATABASE=1` only when
 * the target is genuinely disposable.
 */
export default function globalSetup(): void {
	const url = process.env.TEST_DATABASE_URL;

	// No URL means every database test is skipped, so there is nothing to guard.
	if (!url) {
		return;
	}

	if (process.env.ALLOW_NON_TEST_DATABASE === '1') {
		return;
	}

	const name = databaseName(url);

	if (!name.toLowerCase().includes('test')) {
		throw new Error(
			`Refusing to run database tests against "${name || url}". ` +
				'Create a dedicated test database (for example internery_test), put its URL in ' +
				'.env.test, and run `pnpm test:db`. See README.md.'
		);
	}
}

/** Reads the database name from a PostgreSQL connection URL. */
function databaseName(url: string): string {
	try {
		return new URL(url).pathname.replace(/^\//, '');
	} catch {
		return '';
	}
}
