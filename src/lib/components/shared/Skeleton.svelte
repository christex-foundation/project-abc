<script lang="ts">
	let { class: className = '' }: { class?: string } = $props();
</script>

<div
	class={`animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800/70 ${className}`}
	aria-hidden="true"
></div>
