<script lang="ts">
	import type { AuthedUser } from '$lib/server/auth-helpers';
	import logoMark from '$lib/assets/logo-mark.svg';

	type Props = { user: AuthedUser | null; isAdminHost: boolean; adminUrl?: string };
	let { user, isAdminHost, adminUrl = '' }: Props = $props();
</script>

<!--
  Public / logged-out header. Logged-in users see <TopNav> instead, mounted
  from +layout.svelte. Keep this minimal — it's the marketing-edge chrome.
-->
<header class="border-bone bg-cream border-b">
	<div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
		<a href={isAdminHost ? '/admin' : '/'} class="flex items-center gap-2">
			<img src={logoMark} alt="" class="h-8 w-8" />
			<span class="font-display text-ink text-3xl font-bold tracking-tight lowercase">
				fow<span class="text-terracotta">.</span>{isAdminHost ? ' · admin' : ''}
			</span>
		</a>
		<nav class="flex items-center gap-3 text-sm">
			{#if !isAdminHost}
				<a href="/bounties" class="text-ink-soft hover:text-ink transition-colors">Bounties</a>
			{/if}
			{#if user}
				{#if !isAdminHost && user.role === 'ADMIN' && adminUrl}
					<a href={adminUrl} class="text-ink-soft hover:text-ink transition-colors">
						Admin portal
					</a>
				{/if}
				<form method="POST" action="/logout">
					<button type="submit" class="text-ink-soft hover:text-ink transition-colors">
						Sign out
					</button>
				</form>
			{:else if isAdminHost}
				<a href="/login" class="text-ink-soft hover:text-ink transition-colors">Sign in</a>
			{:else}
				<a
					href="/register"
					class="bg-ink text-cream hover:bg-terracotta rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
				>
					Get started
				</a>
			{/if}
		</nav>
	</div>
</header>
