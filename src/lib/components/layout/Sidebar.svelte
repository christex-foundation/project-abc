<!-- Desktop counterpart to BottomNav. -->
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
		{#if isAdminHost}
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/admin">Overview</a>
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/admin/users">Users</a>
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/admin/bounties">Bounties</a>
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/admin/payments">Payments</a>
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/admin/disputes">Disputes</a>
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/admin/skills">Skills</a>
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/admin/invites">Invites</a>
			<a class="block rounded px-3 py-2 hover:bg-zinc-100" href="/admin/settings">Settings</a>
		{:else}
			{#if user}
				<a href={profileHref} class="mb-3 flex items-center gap-2 rounded-md bg-zinc-50 px-3 py-2 hover:bg-zinc-100">
					<UserAvatar seed={user.name ?? user.email} size={32} />
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
			{/if}
		{/if}
	</nav>
</aside>
