<script lang="ts" module>
	export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success';

	const VARIANTS: Record<BadgeVariant, string> = {
		default: 'border-transparent bg-ink text-cream',
		secondary: 'border-transparent bg-paper text-ink',
		outline: 'border-bone bg-transparent text-ink',
		destructive: 'border-transparent bg-red-100 text-red-900',
		success: 'border-transparent bg-forest-soft text-forest'
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
