<script lang="ts">
	import type { AuthedUser } from '$lib/server/auth-helpers';

	type Props = { user: AuthedUser | null; isAdminHost: boolean; adminUrl?: string };
	let { user, isAdminHost, adminUrl = '' }: Props = $props();
</script>

<header class="border-b border-zinc-200 bg-white">
	<div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
		<a href={isAdminHost ? '/admin' : '/'} class="font-semibold tracking-tight">
			FOW{isAdminHost ? ' · Admin' : ''}
		</a>
		<nav class="flex items-center gap-4 text-sm">
			{#if !isAdminHost}
				<a href="/bounties" class="text-zinc-700 hover:text-zinc-900">Bounties</a>
			{/if}
			{#if user}
				<span class="text-zinc-500">{user.email}</span>
				{#if !isAdminHost && user.role === 'ADMIN' && adminUrl}
					<a href={adminUrl} class="text-zinc-700 hover:text-zinc-900">Admin portal</a>
				{/if}
				<form method="POST" action="/api/auth/sign-out">
					<button type="submit" class="text-zinc-700 hover:text-zinc-900">Sign out</button>
				</form>
			{:else}
				<a href="/login" class="text-zinc-700 hover:text-zinc-900">Sign in</a>
				{#if !isAdminHost}
					<a href="/register" class="rounded bg-zinc-900 px-3 py-1 text-white">Sign up</a>
				{/if}
			{/if}
		</nav>
	</div>
</header>
