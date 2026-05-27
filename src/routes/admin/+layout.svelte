<script lang="ts">
	import AdminSidebar from '$lib/components/layout/AdminSidebar.svelte';
	import AdminTopbar from '$lib/components/layout/AdminTopbar.svelte';

	let { data, children } = $props();
</script>

<div class="flex min-h-screen bg-zinc-50 text-zinc-900">
	<AdminSidebar badges={data.badges} />
	<div class="flex min-h-screen min-w-0 flex-1 flex-col">
		<AdminTopbar user={data.user} featureFlags={data.featureFlags} />
		<main class="flex-1 px-6 py-6 md:px-8 md:py-8">
			{@render children()}
		</main>
	</div>
</div>
