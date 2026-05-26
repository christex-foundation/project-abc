<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = {
		class?: string;
		checked?: boolean;
	} & Omit<HTMLInputAttributes, 'class' | 'checked' | 'type'>;

	let { class: className, checked = $bindable(false), ...rest }: Props = $props();
</script>

<input
	type="checkbox"
	bind:checked
	class={cn(
		'h-4 w-4 shrink-0 rounded border border-zinc-300 text-zinc-900',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...rest}
/>
