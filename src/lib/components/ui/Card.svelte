<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = { class?: string; children: Snippet } & Omit<
		HTMLAttributes<HTMLDivElement>,
		'class' | 'children'
	>;
	let { class: className, children, ...rest }: Props = $props();
</script>

<div
	class={cn('border-bone rounded-[var(--radius-card)] border bg-white shadow-[var(--shadow-card)]', className)}
	{...rest}
>
	{@render children()}
</div>
