<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = { class?: string };
	let { class: className }: Props = $props();

	// A 24-cell band, deterministic, kente-inspired. Order alternates terracotta /
	// forest / ochre / ink so it reads as a textile, not a color picker.
	const PALETTE = [
		'var(--color-terracotta)',
		'var(--color-forest)',
		'var(--color-ochre)',
		'var(--color-ink)',
		'var(--color-terracotta)',
		'var(--color-ochre)',
		'var(--color-forest)',
		'var(--color-clay)'
	];
	const CELLS = Array.from({ length: 24 }, (_, i) => PALETTE[i % PALETTE.length]);
</script>

<div
	class={cn('flex h-2.5 w-full overflow-hidden rounded-full', className)}
	role="presentation"
	aria-hidden="true"
>
	{#each CELLS as fill, i (i)}
		<span
			class="block flex-1"
			style="background: {fill}; clip-path: {i % 3 === 0
				? 'polygon(0 0, 100% 0, 92% 100%, 0% 100%)'
				: i % 3 === 1
					? 'polygon(0 0, 100% 0, 100% 100%, 8% 100%)'
					: 'none'};"
		></span>
	{/each}
</div>
