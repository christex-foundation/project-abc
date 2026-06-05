<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = {
		class?: string;
		value?: string | number | null;
	} & Omit<HTMLInputAttributes, 'class' | 'value'>;

	let { class: className, value = $bindable(), ...rest }: Props = $props();
</script>

<input
	bind:value
	class={cn(
		'border-bone bg-cream text-ink flex h-10 w-full rounded-xl border px-3 py-2 text-sm',
		'placeholder:text-ink-soft/60 focus-visible:outline-none focus-visible:ring-2',
		'focus-visible:ring-terracotta focus-visible:ring-offset-cream focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...rest}
/>
