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
			'text-ink-soft px-3 py-2.5 font-mono text-[11px] font-medium uppercase tracking-wide',
			alignClass,
			className
		)}
	>
		{@render children()}
	</th>
{:else}
	<td {colspan} class={cn('text-ink px-3 py-2.5', alignClass, className)}>
		{@render children()}
	</td>
{/if}
