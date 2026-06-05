<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = { class?: string; children: Snippet };
	let { class: className, children }: Props = $props();
</script>

<p class={cn('text-ink-soft text-sm', className)}>
	{@render children()}
</p>
