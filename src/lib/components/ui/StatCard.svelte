<script lang="ts">
	import type { Snippet, Component } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = {
		label: string;
		value: string | number;
		hint?: string;
		href?: string;
		icon?: Component;
		tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
		class?: string;
		footer?: Snippet;
	};

	let {
		label,
		value,
		hint,
		href,
		icon: Icon,
		tone = 'neutral',
		class: className,
		footer
	}: Props = $props();

	const toneRing = $derived(
		{
			neutral: 'hover:border-bone',
			accent: 'hover:border-terracotta/40',
			success: 'hover:border-forest/40',
			warning: 'hover:border-ochre/40',
			danger: 'hover:border-red-300'
		}[tone]
	);

	const iconColor = $derived(
		{
			neutral: 'text-ink-soft bg-paper',
			accent: 'text-terracotta bg-terracotta-soft',
			success: 'text-forest bg-forest-soft',
			warning: 'text-clay bg-ochre-soft',
			danger: 'text-red-600 bg-red-50'
		}[tone]
	);

	const Tag = $derived(href ? 'a' : 'div');
</script>

<svelte:element
	this={Tag}
	{href}
	class={cn(
		'group border-bone fow-lift block rounded-[var(--radius-card)] border bg-white p-4 shadow-[var(--shadow-card)] transition-colors',
		toneRing,
		className
	)}
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<p class="text-ink-soft font-mono text-[11px] font-medium uppercase tracking-wide">{label}</p>
			<p class="text-ink mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
			{#if hint}
				<p class="text-ink-soft mt-1 text-xs">{hint}</p>
			{/if}
		</div>
		{#if Icon}
			<div class={cn('rounded-lg p-2', iconColor)}>
				<Icon class="h-4 w-4" />
			</div>
		{/if}
	</div>
	{#if footer}
		<div class="border-bone text-ink-soft mt-3 border-t pt-3 text-xs">
			{@render footer()}
		</div>
	{/if}
</svelte:element>
