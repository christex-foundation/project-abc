<script lang="ts">
	let { children } = $props();
</script>

<div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center py-12">
	<div class="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
		{@render children()}
	</div>
</div>
