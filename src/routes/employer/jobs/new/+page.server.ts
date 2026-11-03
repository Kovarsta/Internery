import { fail, redirect } from '@sveltejs/kit';
import { apiGet } from '#lib/api/client.ts';
import { readErrorMessage } from '#lib/api/error-message.ts';
import type { Category } from '#lib/api/types.ts';
import type { Actions, PageServerLoad } from './$types';

type SalaryType = 'HOURLY' | 'DAILY' | 'FIXED';

type JobFormValues = {
	title: string;
	categoryId: string;
	description: string;
	location: string;
	schedule: string;
	salaryAmount: string;
	salaryType: SalaryType;
	startDate: string;
	endDate: string;
	positionsNeeded: string;
};

/** Loads the categories the employer can post into. */
export const load: PageServerLoad = async (event) => {
	const categories = await apiGet<Category[]>(event, '/api/v1/categories');

	return { categories };
};

/**
 * Publishes a job through `POST /jobs`.
 *
 * The checks here only catch what a person can fix on the form; the API still
 * validates every field, enforces an active category and flags scam keywords.
 * The API's message is returned as-is when it rejects the payload.
 */
export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const values = readValues(form);
		const problem = findProblem(values);

		if (problem) {
			return fail(400, { message: problem, values });
		}

		const response = await event.fetch('/api/v1/jobs', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(toPayload(values))
		});

		if (!response.ok) {
			return fail(response.status, {
				message: await readErrorMessage(response),
				values
			});
		}

		redirect(303, '/employer/jobs?created=1');
	}
};

function readValues(form: FormData): JobFormValues {
	return {
		title: readText(form.get('title')),
		categoryId: readText(form.get('categoryId')),
		description: readText(form.get('description')),
		location: readText(form.get('location')),
		schedule: readText(form.get('schedule')),
		salaryAmount: readText(form.get('salaryAmount')),
		salaryType: readSalaryType(form.get('salaryType')),
		startDate: readText(form.get('startDate')),
		endDate: readText(form.get('endDate')),
		positionsNeeded: readText(form.get('positionsNeeded'))
	};
}

function readText(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}

function readSalaryType(value: FormDataEntryValue | null): SalaryType {
	if (value === 'HOURLY' || value === 'DAILY' || value === 'FIXED') {
		return value;
	}

	return 'HOURLY';
}

/** Returns the first form problem, or null when the values can be sent. */
function findProblem(values: JobFormValues): string | null {
	const required = [
		values.title,
		values.categoryId,
		values.description,
		values.location,
		values.schedule,
		values.startDate,
		values.endDate
	];

	if (required.some((value) => value === '')) {
		return 'Fill in every field.';
	}

	if (!isPositiveInteger(values.salaryAmount)) {
		return 'Pay must be a whole VND amount.';
	}

	if (!isPositiveInteger(values.positionsNeeded)) {
		return 'Positions must be a whole number of at least 1.';
	}

	if (values.endDate <= values.startDate) {
		return 'The end date must be after the start date.';
	}

	return null;
}

function isPositiveInteger(value: string): boolean {
	const parsed = Number(value);

	return Number.isInteger(parsed) && parsed > 0;
}

function toPayload(values: JobFormValues) {
	return {
		...values,
		salaryAmount: Number(values.salaryAmount),
		positionsNeeded: Number(values.positionsNeeded)
	};
}
