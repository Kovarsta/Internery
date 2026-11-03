<script lang="ts">
	/**
	 * Verify a work record (`/work-records/[recordId]/verify`).
	 *
	 * Reads `GET /work-records/{recordId}/verify`, which recomputes the HMAC over the stored payload.
	 * A valid record shows the signed facts; a tampered one shows no personal data at all.
	 */

	import { resolve } from '$app/paths';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.ts';
	import { formatDateRange, formatTimestamp } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const result = $derived(data.result);
	const record = $derived(result.record);
</script>

<h1 class="text-3xl font-extrabold tracking-tight">Verify a work record</h1>
<p class="mt-2 max-w-2xl text-ink/70">
	Each record is signed by the employer who issued it. Verification recomputes the signature over
	the stored content and compares it with the one on file.
</p>

{#if result.valid && record}
	<section class="mt-6 border-t-4 border-chalk bg-card p-6">
		<p class="text-sm font-semibold text-chalk">Signature valid</p>
		<p class="mt-1 text-sm text-ink/70">
			The stored record still matches the signature issued for it.
		</p>

		<dl class="mt-6 grid gap-4 sm:grid-cols-2">
			<div>
				<dt class="text-xs tracking-wide text-ink/50 uppercase">Student</dt>
				<dd class="mt-1 font-medium">{record.studentName}</dd>
			</div>

			<div>
				<dt class="text-xs tracking-wide text-ink/50 uppercase">Employer</dt>
				<dd class="mt-1 font-medium">{record.employerName}</dd>
			</div>

			<div>
				<dt class="text-xs tracking-wide text-ink/50 uppercase">Job</dt>
				<dd class="mt-1 font-medium">{record.jobTitle}</dd>
			</div>

			<div>
				<dt class="text-xs tracking-wide text-ink/50 uppercase">Worked</dt>
				<dd class="mt-1 font-medium">{formatDateRange(record.startDate, record.endDate)}</dd>
			</div>

			<div>
				<dt class="text-xs tracking-wide text-ink/50 uppercase">Rating</dt>
				<dd class="mt-1 font-medium">{record.rating} / 5</dd>
			</div>

			<div>
				<dt class="text-xs tracking-wide text-ink/50 uppercase">Issued</dt>
				<dd class="mt-1 font-medium">{formatTimestamp(record.issuedAt)}</dd>
			</div>

			{#if record.comment}
				<div class="sm:col-span-2">
					<dt class="text-xs tracking-wide text-ink/50 uppercase">Employer comment</dt>
					<dd class="mt-1 border-l-2 border-rule pl-3 text-ink/80">{record.comment}</dd>
				</div>
			{/if}

			<div class="sm:col-span-2">
				<dt class="text-xs tracking-wide text-ink/50 uppercase">Record id</dt>
				<dd class="mt-1 font-mono text-sm text-ink/70">{record.id}</dd>
			</div>
		</dl>
	</section>
{:else}
	<Alert class="mt-6" variant="destructive">
		<AlertTitle>Signature does not match</AlertTitle>
		<AlertDescription>
			The stored record changed after it was signed, so its content cannot be trusted. The personal
			details are withheld.
		</AlertDescription>
	</Alert>
{/if}

<p class="mt-6 text-sm">
	<a class="font-medium text-chalk hover:underline" href={resolve('work-records')}>
		Back to all work records
	</a>
</p>
