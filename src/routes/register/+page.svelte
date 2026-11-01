<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader
	title="Create an account"
	description="Students apply for jobs; employers post them. Email verification is required before signing in."
/>

<form class="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6">
	<div>
		<label class="block text-sm font-medium text-slate-700" for="register-name">Full name</label>
		<input
			autocomplete="name"
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="register-name"
			name="name"
			type="text"
		/>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="register-email">Email</label>
		<input
			autocomplete="email"
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="register-email"
			name="email"
			type="email"
		/>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="register-password">Password</label>
		<input
			autocomplete="new-password"
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="register-password"
			name="password"
			type="password"
		/>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="register-role">I am a</label>
		<select
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="register-role"
			name="role"
		>
			<option value="STUDENT">Student looking for part-time work</option>
			<option value="EMPLOYER">Employer posting jobs</option>
		</select>
	</div>

	<button
		class="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
		disabled
		type="button"
	>
		Create account
	</button>
</form>

<div class="mt-4 max-w-md">
	<SkeletonNotice>
		Registration is not wired yet. Better Auth handles signup, email verification and the session.
	</SkeletonNotice>
</div>
