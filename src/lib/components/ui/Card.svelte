<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = { class?: string; children: Snippet };
	let { class: className, children }: Props = $props();
</script>

<div class={cn('rounded-lg border border-zinc-200 bg-white shadow-sm', className)}>
	{@render children()}
</div>
