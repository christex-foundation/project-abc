<!-- Desktop counterpart to BottomNav. Public/platform pages only — admin uses AdminSidebar. -->
<script lang="ts">
	import type { AuthedUser } from '$lib/server/auth-helpers';
	import UserAvatar from '$lib/components/shared/UserAvatar.svelte';

	type Props = { user: AuthedUser | null; isAdminHost: boolean };
	let { user, isAdminHost }: Props = $props();

	const profileHref = $derived(
		user?.role === 'COMPANY' ? '/dashboard/company/profile' : '/dashboard/freelancer/profile'
	);
</script>

<aside class="hidden w-56 shrink-0 border-r border-zinc-200 md:block">
	<nav class="space-y-1 p-4 text-sm">
		{#if user}
			<a
				href={profileHref}
				class="mb-3 flex items-center gap-2 rounded-md bg-zinc-50 px-3 py-2 hover:bg-zinc-100"
			>
				{#if user.role !== 'COMPANY'}
					<UserAvatar seed={user.name ?? user.email} size={32} />
				{/if}
				<span class="truncate text-xs text-zinc-700">{user.name ?? user.email}</span>
			</a>
		{/if}
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
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/notifications">Notifications</a>
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href={profileHref}>Profile</a>
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/settings/notifications">
				Notification settings
			</a>
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/settings/account">
				Account &amp; data
			</a>
		{/if}
		{#if isAdminHost}
			<!-- Admin host: when an admin lands on a non-admin path we still surface a route to /admin. -->
			<a
				class="mt-2 block rounded bg-indigo-50 px-3 py-2 text-indigo-700 hover:bg-indigo-100"
				href="/admin"
			>
				Admin console →
			</a>
		{/if}
	</nav>
</aside>
