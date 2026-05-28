<script lang="ts">
	import { cn } from '$lib/utils';

	type Category = { label: string; skillIds: string[]; emoji: string };

	type Props = {
		categories?: Category[];
		activeLabel?: string | null;
		onSelect?: (cat: Category | null) => void;
	};

	// Curated top-level clusters. Skill IDs come in via props for flexibility,
	// but we ship a sensible default set of labels here so the chips are useful
	// even before the caller wires skill IDs.
	const DEFAULT_CATEGORIES: Category[] = [
		{ label: 'Build', skillIds: [], emoji: '⚒' },
		{ label: 'Design', skillIds: [], emoji: '◆' },
		{ label: 'Write', skillIds: [], emoji: '✎' },
		{ label: 'Data', skillIds: [], emoji: '▤' },
		{ label: 'Translate', skillIds: [], emoji: '⌘' },
		{ label: 'Research', skillIds: [], emoji: '◐' }
	];

	let { categories = DEFAULT_CATEGORIES, activeLabel = null, onSelect }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-2">
	<button
		type="button"
		class={cn(
			'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
			activeLabel == null
				? 'border-ink bg-ink text-cream'
				: 'border-bone bg-cream text-ink-soft hover:border-ink hover:text-ink'
		)}
		onclick={() => onSelect?.(null)}
	>
		All
	</button>
	{#each categories as cat (cat.label)}
		<button
			type="button"
			class={cn(
				'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
				activeLabel === cat.label
					? 'border-terracotta bg-terracotta-soft text-clay'
					: 'border-bone bg-cream text-ink-soft hover:border-terracotta hover:text-ink'
			)}
			onclick={() => onSelect?.(cat)}
		>
			<span class="text-terracotta">{cat.emoji}</span>
			{cat.label}
		</button>
	{/each}
</div>
