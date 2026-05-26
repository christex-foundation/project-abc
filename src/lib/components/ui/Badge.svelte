<script lang="ts" module>
	export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success';

	const VARIANTS: Record<BadgeVariant, string> = {
		default: 'border-transparent bg-zinc-900 text-white',
		secondary: 'border-transparent bg-zinc-100 text-zinc-900',
		outline: 'border-zinc-300 bg-transparent text-zinc-900',
		destructive: 'border-transparent bg-red-100 text-red-900',
		success: 'border-transparent bg-emerald-100 text-emerald-900'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = {
		variant?: BadgeVariant;
		class?: string;
		children: Snippet;
	};

	let { variant = 'default', class: className, children }: Props = $props();
</script>

<span
	class={cn(
		'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
		VARIANTS[variant],
		className
	)}
>
	{@render children()}
</span>
