<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = {
		class?: string;
		children: Snippet;
		header?: boolean;
		align?: 'left' | 'right' | 'center';
		colspan?: number;
	};

	let { class: className, children, header = false, align = 'left', colspan }: Props = $props();

	const alignClass = $derived(
		align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
	);
</script>

{#if header}
	<th
		{colspan}
		class={cn(
			'px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500',
			alignClass,
			className
		)}
	>
		{@render children()}
	</th>
{:else}
	<td {colspan} class={cn('px-3 py-2.5 text-zinc-800', alignClass, className)}>
		{@render children()}
	</td>
{/if}
