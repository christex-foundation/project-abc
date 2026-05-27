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
			neutral: 'hover:border-zinc-300',
			accent: 'hover:border-indigo-300',
			success: 'hover:border-emerald-300',
			warning: 'hover:border-amber-300',
			danger: 'hover:border-red-300'
		}[tone]
	);

	const iconColor = $derived(
		{
			neutral: 'text-zinc-500 bg-zinc-100',
			accent: 'text-indigo-600 bg-indigo-50',
			success: 'text-emerald-600 bg-emerald-50',
			warning: 'text-amber-600 bg-amber-50',
			danger: 'text-red-600 bg-red-50'
		}[tone]
	);

	const Tag = $derived(href ? 'a' : 'div');
</script>

<svelte:element
	this={Tag}
	{href}
	class={cn(
		'group block rounded-xl border border-zinc-200 bg-white p-4 transition-colors',
		toneRing,
		className
	)}
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<p class="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
			<p class="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
			{#if hint}
				<p class="mt-1 text-xs text-zinc-500">{hint}</p>
			{/if}
		</div>
		{#if Icon}
			<div class={cn('rounded-lg p-2', iconColor)}>
				<Icon class="h-4 w-4" />
			</div>
		{/if}
	</div>
	{#if footer}
		<div class="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
			{@render footer()}
		</div>
	{/if}
</svelte:element>
