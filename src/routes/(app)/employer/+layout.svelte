<script lang="ts">
	/**
	 * Employer workspace layout (`/employer/*`).
	 *
	 * This area is for role work only: jobs and applicants. The company profile belongs to the
	 * account area at `/me/company-profile`, so the two tab sets do not replace each other.
	 */

	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

{@render children()}
