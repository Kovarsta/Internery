/**
 * Job suggestions (US-36).
 *
 * The model never queries the database. The service filters open jobs by the
 * student's major and skills in SQL, hands at most 20 candidates to the
 * provider, and turns the answer back into job rows. A missing major is a
 * `422 PROFILE_INCOMPLETE` and the provider is not called (AC-36.2).
 *
 * Suggestions never read the CV or require AI consent: they send the profile
 * fields and public job adverts only.
 *
 * When the provider fails, times out, or the daily call budget is spent, the
 * response still succeeds with `source: FALLBACK` and a local ranking
 * (AC-36.3). Jobs that are no longer open are dropped from the answer
 * (AC-36.4), including ids the model invented.
 */
import { and, desc, eq, inArray, notInArray, or, sql, type SQL } from 'drizzle-orm';
import { DomainError } from '#lib/server/api/errors.ts';
import { containsText } from '#lib/server/api/sql.ts';
import type { Database } from '#lib/server/db/types.ts';
import { categories, employerProfiles, jobs, locations } from '#lib/server/db/product.schema.ts';
import { AI_TIMEOUT_MS, type AiProvider, type AiVerdict } from '#lib/server/ai/provider.ts';
import { jobSummarySelection, type JobSummaryRecord } from '#lib/server/services/jobs/index.ts';
import { getStudentProfile } from '#lib/server/services/profiles.ts';
import { toAiJobContext } from './context.ts';
import { releaseAiCall, reserveAiCall } from './usage.ts';

/** Most candidates the model is allowed to rank. */
const MAX_CANDIDATES = 20;

/** Most suggestions the contract allows in the answer. */
const MAX_SUGGESTIONS = 5;

/** Most distinct profile terms used for the SQL pre-filter. */
const MAX_MATCH_TERMS = 6;

/** Shown when no open job matches the profile at all. */
const NO_MATCH_NOTICE =
	'No open jobs match your major and skills right now. Try again after you update your profile.';
/** Shown when the local ranking replaces the model because the daily budget is spent. */
const LIMIT_NOTICE =
	'You have reached the daily AI limit. These jobs are ranked by your profile and schedule.';
/** Shown when the model fails or returns nothing usable. */
const UNAVAILABLE_NOTICE =
	'AI ranking is unavailable right now. These jobs are ranked by your profile and schedule.';

/** A candidate carries its description for the provider and the local score. */
type JobCandidate = JobSummaryRecord & { description: string };

/** One suggested job. `verdict` stays null because ranking does not judge fit. */
export type JobSuggestion = {
	job: JobSummaryRecord;
	verdict: AiVerdict | null;
};

/** What the API returns for `GET /me/ai/suggestions`. */
export type JobSuggestions = {
	source: 'AI' | 'FALLBACK';
	notice: string | null;
	items: JobSuggestion[];
};

/**
 * Returns up to five open jobs for one student.
 *
 * Throws `DomainError` with `PROFILE_INCOMPLETE` when the profile has no
 * major. Every other failure is absorbed into the fallback answer.
 */
export async function getJobSuggestions(
	database: Database,
	provider: AiProvider,
	studentId: string
): Promise<JobSuggestions> {
	const profile = await getStudentProfile(database, studentId);
	const major = profile?.major?.trim() ?? '';

	if (major.length === 0) {
		throw new DomainError('PROFILE_INCOMPLETE');
	}

	const skills = profile?.skills.map((skill) => skill.trim()).filter(Boolean) ?? [];
	const terms = uniqueTerms([major, ...skills]).slice(0, MAX_MATCH_TERMS);

	const matched = await findOpenJobsMatching(database, terms, MAX_CANDIDATES);
	const candidates = await topUpCandidates(database, matched, MAX_CANDIDATES);

	if (candidates.length === 0) {
		return { source: 'FALLBACK', notice: NO_MATCH_NOTICE, items: [] };
	}

	// Used for the fallback answer and as a stable order when the model returns
	// nothing usable.
	const localOrder = rankCandidatesLocally(candidates, terms);

	const reservation = await reserveAiCall(database, studentId);

	if (!reservation) {
		return fallbackAnswer(localOrder, LIMIT_NOTICE);
	}

	let rankedJobIds: string[];

	try {
		const answer = await provider.rankJobs(
			{
				student: { major, skills, availability: profile?.availability ?? null },
				jobs: candidates.map(toAiJobContext)
			},
			AbortSignal.timeout(AI_TIMEOUT_MS)
		);

		rankedJobIds = answer.rankedJobIds;
	} catch (error) {
		// No answer means no call was used.
		await releaseAiCall(database, studentId, reservation);

		console.error('[ai:suggestions]', error);

		return fallbackAnswer(localOrder, UNAVAILABLE_NOTICE);
	}

	const suggestions = await keepOpenCandidates(database, candidates, rankedJobIds);

	// A model that returns only invented ids is as useful as an unavailable
	// one, so the student still gets the local ranking.
	if (suggestions.length === 0) {
		return fallbackAnswer(localOrder, UNAVAILABLE_NOTICE);
	}

	return {
		source: 'AI',
		notice: null,
		items: suggestions.map((job) => ({ job, verdict: null }))
	};
}

/** Opens jobs that match at least one profile term. */
async function findOpenJobsMatching(
	database: Database,
	terms: string[],
	limit: number
): Promise<JobCandidate[]> {
	const matches = terms.map((term) =>
		or(
			containsText(jobs.title, term),
			containsText(jobs.description, term),
			containsText(categories.name, term)
		)
	);

	const matchCondition = matches.length > 0 ? or(...matches) : undefined;

	return selectCandidates(database)
		.where(and(openJobsCondition(), matchCondition))
		.orderBy(desc(jobs.createdAt), desc(jobs.id))
		.limit(limit);
}

/**
 * Fills the candidate list up to `minimum` with recent open jobs.
 *
 * Matching by keyword can be narrow; without a top-up a student with a rare
 * major would see an empty page even though the marketplace has jobs.
 */
async function topUpCandidates(
	database: Database,
	matched: JobCandidate[],
	limit: number
): Promise<JobCandidate[]> {
	if (matched.length >= MAX_SUGGESTIONS) {
		return matched;
	}

	const matchedIds = matched.map((job) => job.id);
	const conditions: SQL[] = [openJobsCondition()];

	if (matchedIds.length > 0) {
		conditions.push(notInArray(jobs.id, matchedIds));
	}

	const recent = await selectCandidates(database)
		.where(and(...conditions))
		.orderBy(desc(jobs.createdAt), desc(jobs.id))
		.limit(limit - matched.length);

	return [...matched, ...recent];
}

/** The shared candidate projection: a job summary plus its description. */
function selectCandidates(database: Database) {
	return database
		.select({ ...jobSummarySelection, description: jobs.description })
		.from(jobs)
		.innerJoin(categories, eq(categories.id, jobs.categoryId))
		.innerJoin(locations, eq(locations.id, jobs.locationId))
		.leftJoin(employerProfiles, eq(employerProfiles.userId, jobs.employerId));
}

/** A job is suggestible only while it is hiring and visible. */
function openJobsCondition(): SQL {
	return sql`${jobs.status} = 'HIRING' and ${jobs.isHidden} = false`;
}

/**
 * Orders candidates by how many profile terms they contain, then newest
 * first.
 *
 * Exported for tests: the fallback answer must be predictable without a
 * database.
 */
export function rankCandidatesLocally(candidates: JobCandidate[], terms: string[]): JobCandidate[] {
	return [...candidates].sort((left, right) => {
		const scoreDifference = localScore(right, terms) - localScore(left, terms);

		if (scoreDifference !== 0) {
			return scoreDifference;
		}

		return right.createdAt.getTime() - left.createdAt.getTime();
	});
}

/** Counts the profile terms that appear in the job's text. */
function localScore(job: JobCandidate, terms: string[]): number {
	const haystack = `${job.title} ${job.categoryName} ${job.description}`.toLowerCase();

	return terms.reduce((score, term) => {
		return haystack.includes(term.toLowerCase()) ? score + 1 : score;
	}, 0);
}

/**
 * Keeps the model's order but drops ids outside the candidate list and jobs
 * that stopped hiring since the candidate query.
 */
async function keepOpenCandidates(
	database: Database,
	candidates: JobCandidate[],
	rankedJobIds: string[]
): Promise<JobCandidate[]> {
	const candidatesById = new Map(candidates.map((job) => [job.id, job]));
	const wantedIds: string[] = [];

	for (const id of rankedJobIds) {
		if (candidatesById.has(id) && !wantedIds.includes(id)) {
			wantedIds.push(id);
		}
	}

	const limitedIds = wantedIds.slice(0, MAX_SUGGESTIONS);

	if (limitedIds.length === 0) {
		return [];
	}

	const openRows = await database
		.select({ id: jobs.id })
		.from(jobs)
		.where(and(inArray(jobs.id, limitedIds), openJobsCondition()));

	const openIds = new Set(openRows.map((row) => row.id));

	const suggestions: JobCandidate[] = [];

	for (const id of limitedIds) {
		const job = candidatesById.get(id);

		if (job && openIds.has(id)) {
			suggestions.push(job);
		}
	}

	return suggestions;
}

/** Builds a fallback answer from the local order. */
function fallbackAnswer(candidates: JobCandidate[], notice: string): JobSuggestions {
	return {
		source: 'FALLBACK',
		notice,
		items: candidates.slice(0, MAX_SUGGESTIONS).map((job) => ({ job, verdict: null }))
	};
}

/** Trims, lower-cases and de-duplicates profile terms for matching. */
function uniqueTerms(values: string[]): string[] {
	const seen = new Set<string>();
	const terms: string[] = [];

	for (const value of values) {
		const term = value.trim();

		if (term.length === 0) {
			continue;
		}

		const key = term.toLowerCase();

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		terms.push(term);
	}

	return terms;
}
