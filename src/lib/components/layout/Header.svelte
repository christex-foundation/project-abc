<script lang="ts">
	import type { AuthedUser } from '$lib/server/auth-helpers';

	type Props = { user: AuthedUser | null; isAdminHost: boolean; adminUrl?: string };
	let { user, isAdminHost, adminUrl = '' }: Props = $props();
</script>

<!--
  Public / logged-out header. Logged-in users see <TopNav> instead, mounted
  from +layout.svelte. Keep this minimal — it's the marketing-edge chrome.
-->
<header class="border-bone bg-cream border-b">
	<div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
		<a
			href={isAdminHost ? '/admin' : '/'}
			class="font-display text-ink text-2xl font-semibold tracking-tight"
			style="font-variation-settings: 'opsz' 144, 'wght' 700;"
		>
			fow<span class="text-terracotta">.</span>{isAdminHost ? ' · admin' : ''}
		</a>
		<nav class="flex items-center gap-3 text-sm">
			{#if !isAdminHost}
				<a href="/bounties" class="text-ink-soft hover:text-ink transition-colors">Bounties</a>
				<a href="/projects" class="text-ink-soft hover:text-ink transition-colors">Projects</a>
			{/if}
			{#if user}
				{#if !isAdminHost && user.role === 'ADMIN' && adminUrl}
					<a href={adminUrl} class="text-ink-soft hover:text-ink transition-colors">
						Admin portal
					</a>
				{/if}
				<form method="POST" action="/api/auth/sign-out">
					<button type="submit" class="text-ink-soft hover:text-ink transition-colors">
						Sign out
					</button>
				</form>
			{:else}
				<a href="/login" class="text-ink-soft hover:text-ink transition-colors">Sign in</a>
				{#if !isAdminHost}
					<a
						href="/register"
						class="bg-ink text-cream hover:bg-terracotta rounded-full px-3.5 py-1.5 transition-colors"
					>
						Get started
					</a>
				{/if}
			{/if}
		</nav>
	</div>
</header>
