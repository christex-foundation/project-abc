<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		icon,
		action
	}: {
		title: string;
		description?: string;
		icon?: Snippet;
		action?: Snippet;
	} = $props();
</script>

<div
	class="border-bone flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed bg-white px-6 py-12 text-center shadow-[var(--shadow-card)]"
>
	{#if icon}
		<div class="text-ink-soft mb-3">
			{@render icon()}
		</div>
	{/if}
	<h3 class="text-ink text-base font-semibold tracking-tight">{title}</h3>
	{#if description}
		<p class="text-ink-soft mt-1 max-w-sm text-sm">{description}</p>
	{/if}
	{#if action}
		<div class="mt-4">
			{@render action()}
		</div>
	{/if}
</div>
