/**
 * Normalises the Better Auth generated Drizzle schema for this project.
 *
 * Better Auth's CLI always emits `timestamp()` without a time zone and plain
 * `text` columns for `additionalFields` enums. The project stores timestamps as
 * `timestamptz` and uses PostgreSQL enums, so patch the generated file after
 * every `auth generate` run. Keeping this in a script makes the change
 * repeatable instead of a hand edit that the next generation would erase.
 */
import { readFile, writeFile } from 'node:fs/promises';

const schemaUrl = new URL('../src/lib/server/db/auth.schema.ts', import.meta.url);
let source = await readFile(schemaUrl, 'utf8');

/**
 * Replaces a required pattern and fails loudly when Better Auth changes its
 * generated output, so a silent no-op does not leave the schema inconsistent.
 */
function replaceOrThrow(pattern, replacement, label) {
	if (!pattern.test(source)) {
		throw new Error(`Could not find ${label} in the generated auth schema`);
	}

	source = source.replace(pattern, replacement);
}

const enumDefinitions = `
export const userRole = pgEnum('user_role', ['STUDENT', 'EMPLOYER', 'ADMIN']);
export const accountStatus = pgEnum('account_status', [
	'PENDING_VERIFICATION',
	'ACTIVE',
	'SUSPENDED',
	'LOCKED',
	'DELETED'
]);
`;

if (!source.includes('export const userRole')) {
	replaceOrThrow(
		/import \{([^}]*)\} from ['"]drizzle-orm\/pg-core['"];\n/,
		(match, importedNames) => {
			const names = importedNames.includes('pgEnum') ? importedNames : `pgEnum, ${importedNames}`;

			return `import { ${names} } from 'drizzle-orm/pg-core';\n\n${enumDefinitions}\n`;
		},
		'pg-core import'
	);
}

replaceOrThrow(
	/text\(\s*['"]role['"]\s*,\s*\{\s*enum:\s*\[[^\]]*\]\s*,?\s*\}\s*\)/s,
	"userRole('role')",
	'users.role text enum'
);

replaceOrThrow(
	/text\(\s*['"]status['"]\s*,\s*\{\s*enum:\s*\[[^\]]*\]\s*,?\s*\}\s*\)/s,
	"accountStatus('status')",
	'users.status text enum'
);

source = source.replace(
	/\btimestamp\(\s*(['"][^'"]+['"])\s*\)/g,
	'timestamp($1, { withTimezone: true })'
);

await writeFile(schemaUrl, source);
