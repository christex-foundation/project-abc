<script lang="ts">
	let { class: className = '' }: { class?: string } = $props();
</script>

<div class={`bg-paper animate-pulse rounded ${className}`} aria-hidden="true"></div>
