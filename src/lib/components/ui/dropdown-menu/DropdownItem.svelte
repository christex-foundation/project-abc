<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = {
		children: Snippet;
		href?: string;
		onclick?: (e: MouseEvent) => void;
		class?: string;
		tone?: 'default' | 'danger';
		disabled?: boolean;
	};

	let {
		children,
		href,
		onclick,
		class: className,
		tone = 'default',
		disabled = false
	}: Props = $props();

	const base =
		'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors';
	const tones = {
		default: 'text-ink hover:bg-paper',
		danger: 'text-red-700 hover:bg-red-50'
	} as const;
</script>

{#if href}
	<a {href} role="menuitem" class={cn(base, tones[tone], className)} aria-disabled={disabled}>
		{@render children()}
	</a>
{:else}
	<button
		type="button"
		role="menuitem"
		{onclick}
		{disabled}
		class={cn(base, tones[tone], 'cursor-pointer disabled:opacity-50', className)}
	>
		{@render children()}
	</button>
{/if}
