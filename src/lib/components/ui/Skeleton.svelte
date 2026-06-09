<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = { class?: string };
	// A neutral placeholder block. Pulse animation is disabled under
	// prefers-reduced-motion via the .fow-skeleton rule in app.css.
	let { class: className }: Props = $props();
</script>

<div class={cn('fow-skeleton bg-bone/70 rounded-md', className)} aria-hidden="true"></div>
