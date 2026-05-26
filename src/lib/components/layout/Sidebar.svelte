<!-- Phase 1 shell — desktop counterpart to BottomNav. Filled out in Phase 2/4. -->
<script lang="ts">
	import type { AuthedUser } from '$lib/server/auth-helpers';

	type Props = { user: AuthedUser | null; isAdminHost: boolean };
	let { user, isAdminHost }: Props = $props();
</script>

<aside class="hidden w-56 shrink-0 border-r border-zinc-200 md:block">
	<nav class="space-y-1 p-4 text-sm">
		{#if isAdminHost}
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/admin">Overview</a>
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/admin/settings">Settings</a>
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/admin/invites">Invites</a>
		{:else}
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/bounties">Browse</a>
			{#if user}
				<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/dashboard">Dashboard</a>
				<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/profile">Profile</a>
			{/if}
		{/if}
	</nav>
</aside>
