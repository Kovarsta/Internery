<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SkeletonNotice from '#lib/components/SkeletonNotice.svelte';
</script>

<PageHeader title="Sign in" description="Use the email address you registered with." />

<form class="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6">
	<div>
		<label class="block text-sm font-medium text-slate-700" for="signin-email">Email</label>
		<input
			autocomplete="email"
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="signin-email"
			name="email"
			type="email"
		/>
	</div>

	<div>
		<label class="block text-sm font-medium text-slate-700" for="signin-password">Password</label>
		<input
			autocomplete="current-password"
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			id="signin-password"
			name="password"
			type="password"
		/>
	</div>

	<button
		class="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
		disabled
		type="button"
	>
		Sign in
	</button>
</form>

<div class="mt-4 max-w-md">
	<SkeletonNotice>
		Sign-in is not wired yet. The form will post to Better Auth at <code
			>/api/auth/sign-in/email</code
		>.
	</SkeletonNotice>
</div>
