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
	class="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-12 text-center"
>
	{#if icon}
		<div class="mb-3 text-zinc-400">
			{@render icon()}
		</div>
	{/if}
	<h3 class="text-base font-semibold text-zinc-900">{title}</h3>
	{#if description}
		<p class="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
	{/if}
	{#if action}
		<div class="mt-4">
			{@render action()}
		</div>
	{/if}
</div>
