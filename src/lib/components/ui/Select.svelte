<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = {
		class?: string;
		value?: string | null;
		children: Snippet;
	} & Omit<HTMLSelectAttributes, 'class' | 'value' | 'children'>;

	let { class: className, value = $bindable(), children, ...rest }: Props = $props();
</script>

<select
	bind:value
	class={cn(
		'flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...rest}
>
	{@render children()}
</select>
