/**
 * AI consent (US-38, AC-38.1, AC-38.3).
 *
 * Consent is a single row per student. A row exists once the student has ever
 * granted consent; `withdrawnAt` is null while consent is active. Withdrawing
 * deletes every cached explanation for that student in the same transaction,
 * so no stored text about their CV survives a withdrawal.
 */
import { eq } from 'drizzle-orm';
import type { Database, Transaction } from '#lib/server/db/types.ts';
import { aiConsents, aiExplanations } from '#lib/server/db/product.schema.ts';

export type AiConsentRecord = typeof aiConsents.$inferSelect;

/** What the API reports and the client shows on the consent screen. */
export type AiConsentState = {
	granted: boolean;
	consentedAt: Date | null;
	withdrawnAt: Date | null;
	dataSent: string;
};

/**
 * Plain-language description of what leaves the server (AC-38.1).
 *
 * It names the provider and the redaction, and it does not promise anonymity:
 * short names and personal details the profile does not know can remain.
 */
export const AI_DATA_NOTICE =
	'Your CV text, with your name, phone number and email removed, and the job advert you asked about. ' +
	'The text is sent to DeepSeek to write the explanation.';

/** Returns the student's current consent state. */
export async function getAiConsent(database: Database, studentId: string): Promise<AiConsentState> {
	const [row] = await database
		.select()
		.from(aiConsents)
		.where(eq(aiConsents.studentId, studentId))
		.limit(1);

	return toConsentState(row ?? null);
}

/**
 * Grants or withdraws consent and returns the new state.
 *
 * Granting twice is idempotent and keeps the original `consentedAt`. Withdrawing
 * when consent was never granted returns the unchanged state instead of writing
 * a row, because `consentedAt` is non-null and a row would claim a grant that
 * never happened.
 *
 * Throws nothing for a missing student; the caller has already authenticated
 * one.
 */
export async function setAiConsent(
	database: Database,
	studentId: string,
	granted: boolean
): Promise<AiConsentState> {
	return database.transaction(async (tx) => {
		if (granted) {
			return grantConsent(tx, studentId);
		}

		return withdrawConsent(tx, studentId);
	});
}

/** Returns true when the student has an active consent row. */
export async function hasActiveAiConsent(database: Database, studentId: string): Promise<boolean> {
	const [row] = await database
		.select({ withdrawnAt: aiConsents.withdrawnAt })
		.from(aiConsents)
		.where(eq(aiConsents.studentId, studentId))
		.limit(1);

	return row !== undefined && row.withdrawnAt === null;
}

/**
 * Creates or reactivates the consent row.
 *
 * The row lock serialises two simultaneous grants, so the later one sees the
 * active row and leaves `consentedAt` alone:
 * https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS
 */
async function grantConsent(tx: Transaction, studentId: string): Promise<AiConsentState> {
	const [existing] = await tx
		.select()
		.from(aiConsents)
		.where(eq(aiConsents.studentId, studentId))
		.for('update');

	if (existing && existing.withdrawnAt === null) {
		return toConsentState(existing);
	}

	const [row] = await tx
		.insert(aiConsents)
		.values({ studentId, consentedAt: new Date(), withdrawnAt: null })
		.onConflictDoUpdate({
			target: aiConsents.studentId,
			set: { consentedAt: new Date(), withdrawnAt: null }
		})
		.returning();

	return toConsentState(row);
}

/**
 * Marks the consent withdrawn and deletes the cached explanations.
 *
 * The delete is the point of AC-38.3: the cache holds job-specific reasons
 * derived from the CV, so leaving it behind would keep the derived text after
 * the student said stop.
 */
async function withdrawConsent(tx: Transaction, studentId: string): Promise<AiConsentState> {
	const [existing] = await tx
		.select()
		.from(aiConsents)
		.where(eq(aiConsents.studentId, studentId))
		.for('update');

	// Never granted, or already withdrawn: nothing to change.
	if (!existing || existing.withdrawnAt !== null) {
		return toConsentState(existing ?? null);
	}

	const [row] = await tx
		.update(aiConsents)
		.set({ withdrawnAt: new Date() })
		.where(eq(aiConsents.studentId, studentId))
		.returning();

	await tx.delete(aiExplanations).where(eq(aiExplanations.studentId, studentId));

	return toConsentState(row);
}

/** Maps a stored row to the API shape. */
function toConsentState(row: AiConsentRecord | null): AiConsentState {
	return {
		granted: row !== null && row.withdrawnAt === null,
		consentedAt: row?.consentedAt ?? null,
		withdrawnAt: row?.withdrawnAt ?? null,
		dataSent: AI_DATA_NOTICE
	};
}
