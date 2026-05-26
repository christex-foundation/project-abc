<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';

	let { data, children } = $props();
</script>

<div class="flex gap-6">
	<Sidebar user={data.user} isAdminHost={data.isAdminHost} />
	<section class="flex-1">
		{@render children()}
	</section>
</div>
