<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = { class?: string; children: Snippet };
	let { class: className, children }: Props = $props();
</script>

<thead class={cn('border-bone bg-paper/50 border-b', className)}>
	{@render children()}
</thead>
