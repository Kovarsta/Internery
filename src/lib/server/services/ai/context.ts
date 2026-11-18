/**
 * Shared conversion from a job row to the provider's job shape.
 *
 * Only fields the model needs cross this boundary. Moderation state, the
 * employer's identity and applicant counts stay on our side.
 */
import type { AiJobContext } from '#lib/server/ai/provider.ts';

/** The job fields the provider may see. */
export type AiJobSource = {
	id: string;
	title: string;
	description: string;
	categoryName: string;
	location: string;
	daysOfWeek: string[];
	startTime: string;
	endTime: string;
	salaryAmount: number;
	salaryType: string;
};

/** Copies a job row into the provider shape. */
export function toAiJobContext(job: AiJobSource): AiJobContext {
	return {
		id: job.id,
		title: job.title,
		description: job.description,
		categoryName: job.categoryName,
		location: job.location,
		daysOfWeek: job.daysOfWeek,
		startTime: job.startTime,
		endTime: job.endTime,
		salaryAmount: job.salaryAmount,
		salaryType: job.salaryType
	};
}
