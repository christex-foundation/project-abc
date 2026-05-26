<!-- Mobile-only tabs. Routes are role-aware so the "Dashboard" tab lands on the right place. -->
<script lang="ts">
	import type { AuthedUser } from '$lib/server/auth-helpers';

	type Props = { user: AuthedUser | null };
	let { user }: Props = $props();

	const dashboardHref = $derived(
		user?.role === 'COMPANY' ? '/dashboard/company/bounties' : '/dashboard'
	);
	const profileHref = $derived(
		user?.role === 'COMPANY' ? '/dashboard/company/profile' : '/dashboard/freelancer/profile'
	);
</script>

{#if user}
	<nav class="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white md:hidden">
		<div class="mx-auto flex max-w-md justify-around py-2 text-xs">
			<a href="/bounties" class="px-3 py-1 text-zinc-700">Browse</a>
			<a href={dashboardHref} class="px-3 py-1 text-zinc-700">Dashboard</a>
			<a href="/notifications" class="px-3 py-1 text-zinc-700">Inbox</a>
			<a href={profileHref} class="px-3 py-1 text-zinc-700">Profile</a>
		</div>
	</nav>
{/if}
