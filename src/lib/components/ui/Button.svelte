<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	export type ButtonVariant =
		| 'default'
		| 'destructive'
		| 'outline'
		| 'secondary'
		| 'ghost'
		| 'link';
	export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

	const VARIANTS: Record<ButtonVariant, string> = {
		default: 'bg-ink text-cream hover:bg-terracotta',
		destructive: 'bg-red-700 text-cream hover:bg-red-800',
		outline: 'border border-bone bg-cream text-ink hover:border-ink',
		secondary: 'bg-paper text-ink hover:bg-bone',
		ghost: 'text-ink hover:bg-paper',
		link: 'text-terracotta underline-offset-4 hover:underline'
	};

	const SIZES: Record<ButtonSize, string> = {
		default: 'h-10 px-5 py-2 text-sm',
		sm: 'h-9 px-3.5 text-xs',
		lg: 'h-12 px-6 text-base',
		icon: 'h-10 w-10'
	};

	export const buttonClass = (variant: ButtonVariant = 'default', size: ButtonSize = 'default') =>
		`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors ` +
		`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-cream ` +
		`disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]}`;
</script>

<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = {
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: string;
		children: Snippet;
		href?: string;
	} & Omit<HTMLButtonAttributes & HTMLAnchorAttributes, 'class' | 'children'>;

	let { variant = 'default', size = 'default', class: className, children, href, ...rest }: Props =
		$props();
</script>

{#if href}
	<a {href} class={cn(buttonClass(variant, size), className)} {...rest}>
		{@render children()}
	</a>
{:else}
	<button class={cn(buttonClass(variant, size), className)} {...rest}>
		{@render children()}
	</button>
{/if}
