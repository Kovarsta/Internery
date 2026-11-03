import type { SalaryType } from '#lib/api/types.ts';

/** The job form as strings, shared by the create and edit pages. */
export type JobFormValues = {
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

/** Defaults for a new job form. */
export const emptyJobFormValues: JobFormValues = {
	title: '',
	categoryId: '',
	description: '',
	location: '',
	schedule: '',
	salaryAmount: '',
	salaryType: 'HOURLY',
	startDate: '',
	endDate: '',
	positionsNeeded: '1'
};

/** Reads the job form values from a submitted form. */
export function readJobForm(form: FormData): JobFormValues {
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

/** Returns the first form problem, or null when the values can be sent. */
export function findJobFormProblem(values: JobFormValues): string | null {
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

/** Converts the form strings to the JSON body the API expects. */
export function toJobPayload(values: JobFormValues) {
	return {
		...values,
		salaryAmount: Number(values.salaryAmount),
		positionsNeeded: Number(values.positionsNeeded)
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

function isPositiveInteger(value: string): boolean {
	const parsed = Number(value);

	return Number.isInteger(parsed) && parsed > 0;
}
