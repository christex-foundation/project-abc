<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = {
		class?: string;
		children: Snippet;
		hover?: boolean;
	} & Omit<HTMLAttributes<HTMLTableRowElement>, 'class' | 'children'>;

	let { class: className, children, hover = true, ...rest }: Props = $props();
</script>

<tr class={cn(hover && 'hover:bg-paper/50 transition-colors', className)} {...rest}>
	{@render children()}
</tr>
