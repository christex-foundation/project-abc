<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = { class?: string; orientation?: 'horizontal' | 'vertical' };
	let { class: className, orientation = 'horizontal' }: Props = $props();
</script>

<div
	role="separator"
	aria-orientation={orientation}
	class={cn('bg-zinc-200', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
></div>
