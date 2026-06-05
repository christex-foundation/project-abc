<script lang="ts">
	let { children } = $props();
</script>

<div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
	<div
		class="border-bone rounded-[var(--radius-card)] border bg-white p-6 shadow-[var(--shadow-card)] sm:p-8"
	>
		{@render children()}
	</div>
</div>
