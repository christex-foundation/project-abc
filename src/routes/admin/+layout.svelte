<script lang="ts">
	import AdminSidebar from '$lib/components/layout/AdminSidebar.svelte';
	import AdminNav from '$lib/components/layout/AdminNav.svelte';
	import AdminTopbar from '$lib/components/layout/AdminTopbar.svelte';

	let { data, children } = $props();

	let menuOpen = $state(false);

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') menuOpen = false;
	}
</script>

<svelte:window onkeydown={menuOpen ? handleKey : undefined} />

<div class="flex min-h-screen bg-zinc-50 text-zinc-900">
	<AdminSidebar badges={data.badges} />
	<div class="flex min-h-screen min-w-0 flex-1 flex-col">
		<AdminTopbar
			user={data.user}
			featureFlags={data.featureFlags}
			onMenuClick={() => (menuOpen = true)}
		/>
		<main class="flex-1 px-4 py-6 md:px-8 md:py-8">
			{@render children()}
		</main>
	</div>
</div>

<!-- Mobile nav drawer (below md). Backdrop + left slide-in reusing AdminNav. -->
{#if menuOpen}
	<div class="fixed inset-0 z-50 md:hidden">
		<button
			type="button"
			class="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
			aria-label="Close navigation menu"
			onclick={() => (menuOpen = false)}
		></button>
		<div class="absolute inset-y-0 left-0 w-72 max-w-[80vw] shadow-xl">
			<AdminNav badges={data.badges} onNavigate={() => (menuOpen = false)} />
		</div>
	</div>
{/if}
