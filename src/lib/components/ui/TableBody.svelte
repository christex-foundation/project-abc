<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = { class?: string; children: Snippet };
	let { class: className, children }: Props = $props();
</script>

<tbody class={cn('divide-y divide-zinc-100', className)}>
	{@render children()}
</tbody>
