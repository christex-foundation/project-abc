<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = { class?: string; children: Snippet };
	let { class: className, children }: Props = $props();
</script>

<thead class={cn('border-b border-zinc-200 bg-zinc-50/60', className)}>
	{@render children()}
</thead>
