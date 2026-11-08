import type { SalaryType } from '#lib/api/types.ts';
import { CLOCK_TIME_PATTERN, type DayOfWeek, isDayOfWeek, sortDaysOfWeek } from '#lib/schedule.ts';

/** The job form as strings, shared by the create and edit pages. */
export type JobFormValues = {
	title: string;
	categoryId: string;
	description: string;
	locationId: string;
	daysOfWeek: DayOfWeek[];
	startTime: string;
	endTime: string;
	scheduleNote: string;
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
	locationId: '',
	daysOfWeek: [],
	startTime: '',
	endTime: '',
	scheduleNote: '',
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
		locationId: readText(form.get('locationId')),
		daysOfWeek: readDaysOfWeek(form.getAll('daysOfWeek')),
		startTime: readText(form.get('startTime')),
		endTime: readText(form.get('endTime')),
		scheduleNote: readText(form.get('scheduleNote')),
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
		values.locationId,
		values.startTime,
		values.endTime,
		values.startDate,
		values.endDate
	];

	if (required.some((value) => value === '')) {
		return 'Fill in every field.';
	}

	if (values.daysOfWeek.length === 0) {
		return 'Pick at least one working day.';
	}

	if (!CLOCK_TIME_PATTERN.test(values.startTime) || !CLOCK_TIME_PATTERN.test(values.endTime)) {
		return 'Enter the start and end time as HH:MM.';
	}

	if (values.endTime <= values.startTime) {
		return 'The end time must be after the start time.';
	}

	if (values.scheduleNote.length > 300) {
		return 'The schedule note must be 300 characters or fewer.';
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
		scheduleNote: values.scheduleNote === '' ? null : values.scheduleNote,
		salaryAmount: Number(values.salaryAmount),
		positionsNeeded: Number(values.positionsNeeded)
	};
}

function readText(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** Keeps only known day values and puts them in Monday-first order. */
function readDaysOfWeek(values: FormDataEntryValue[]): DayOfWeek[] {
	const selected: DayOfWeek[] = [];

	for (const value of values) {
		if (typeof value === 'string' && isDayOfWeek(value)) {
			selected.push(value);
		}
	}

	return sortDaysOfWeek(selected);
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
