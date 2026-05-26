<!-- Desktop counterpart to BottomNav. Phase 2 fills out COMPANY entries. -->
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
				{#if user.role === 'COMPANY'}
					<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/dashboard/company/bounties">
						Your bounties
					</a>
					<a
						class="block rounded bg-zinc-900 px-3 py-2 text-white hover:bg-zinc-800"
						href="/bounties/create"
					>
						+ Create bounty
					</a>
				{:else}
					<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/dashboard">Dashboard</a>
				{/if}
				<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/profile">Profile</a>
			{/if}
		{/if}
	</nav>
</aside>
