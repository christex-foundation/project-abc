<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = {
		title: string;
		description?: string;
		class?: string;
		actions?: Snippet;
		meta?: Snippet;
	};

	let { title, description, class: className, actions, meta }: Props = $props();
</script>

<header class={cn('mb-6 flex flex-wrap items-start justify-between gap-4', className)}>
	<div class="min-w-0">
		<h1 class="fow-display text-ink text-3xl">{title}</h1>
		{#if description}
			<p class="text-ink-soft mt-1 text-sm">{description}</p>
		{/if}
		{#if meta}
			<div class="mt-2 flex flex-wrap items-center gap-2">
				{@render meta()}
			</div>
		{/if}
	</div>
	{#if actions}
		<div class="flex shrink-0 flex-wrap items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</header>
