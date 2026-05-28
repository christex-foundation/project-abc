<script lang="ts">
	import { cn } from '$lib/utils';

	type Mode = 'BOUNTY' | 'PROJECT';

	type Props = {
		value: Mode;
		onChange: (v: Mode) => void;
		bountyCount?: number | null;
		projectCount?: number | null;
	};

	let { value, onChange, bountyCount = null, projectCount = null }: Props = $props();

	const items: Array<{ id: Mode; label: string; count: number | null; tag: string }> = $derived([
		{ id: 'BOUNTY', label: 'Bounties', count: bountyCount, tag: 'Win-only' },
		{ id: 'PROJECT', label: 'Projects', count: projectCount, tag: 'Hire & deliver' }
	]);
</script>

<div
	role="tablist"
	aria-label="Browse mode"
	class="border-bone bg-paper inline-flex items-center gap-1 rounded-2xl border p-1"
>
	{#each items as item (item.id)}
		<button
			type="button"
			role="tab"
			aria-selected={value === item.id}
			class={cn(
				'group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
				value === item.id
					? 'bg-ink text-cream shadow-sm'
					: 'text-ink-soft hover:bg-cream hover:text-ink'
			)}
			onclick={() => onChange(item.id)}
		>
			<span>{item.label}</span>
			{#if item.count != null}
				<span
					class={cn(
						'rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums',
						value === item.id ? 'bg-cream/15 text-cream' : 'bg-bone text-ink-soft'
					)}
				>
					{item.count}
				</span>
			{/if}
			<span
				class={cn(
					'hidden text-[10px] tracking-wide uppercase sm:inline',
					value === item.id ? 'text-cream/60' : 'text-ink-soft/60'
				)}
			>
				{item.tag}
			</span>
		</button>
	{/each}
</div>
