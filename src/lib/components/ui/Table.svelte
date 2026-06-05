<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = {
		class?: string;
		children: Snippet;
	};

	let { class: className, children }: Props = $props();
</script>

<div
	class={cn(
		'border-bone overflow-x-auto rounded-[var(--radius-card)] border bg-white shadow-[var(--shadow-card)]',
		className
	)}
>
	<table class="w-full border-collapse text-[13px]">
		{@render children()}
	</table>
</div>
