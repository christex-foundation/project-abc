<script lang="ts">
	import type { BountyForFreelancer } from '$lib/server/repositories/bounty.repo';
	import { formatMoneyCompact } from '$lib/utils';
	import { cn } from '$lib/utils';

	type Props = {
		bounty: BountyForFreelancer;
		class?: string;
	};

	let { bounty: b, class: className }: Props = $props();

	function deadlineLabel(d: string | Date): { text: string; tone: 'soft' | 'urgent' | 'closed' } {
		const ms = new Date(d).getTime() - Date.now();
		if (ms <= 0) return { text: 'Closed', tone: 'closed' };
		const days = Math.ceil(ms / 86_400_000);
		if (days <= 1) return { text: 'Closes today', tone: 'urgent' };
		if (days <= 3) return { text: `${days}d left`, tone: 'urgent' };
		return { text: `${days}d left`, tone: 'soft' };
	}

	const dl = $derived(deadlineLabel(b.submissionDeadline));
	const sponsorName = $derived(
		b.company?.companyName ?? b.companyNameSnapshot ?? 'Anonymous sponsor'
	);
	const isProject = $derived(b.type === 'PROJECT');
</script>

<a
	href={`/bounties/${b.slug}`}
	class={cn(
		'fow-card group border-bone bg-cream relative flex h-full flex-col gap-4 rounded-2xl border p-5',
		className
	)}
>
	<header class="flex items-start justify-between gap-3">
		<span
			class={cn(
				'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase',
				isProject ? 'bg-forest-soft text-forest' : 'bg-terracotta-soft text-clay'
			)}
		>
			<span class={cn('h-1.5 w-1.5 rounded-full', isProject ? 'bg-forest' : 'bg-terracotta')}
			></span>
			{isProject ? 'Project' : 'Bounty'}
		</span>

		<span
			class={cn(
				'rounded-full px-2.5 py-1 text-[11px] font-medium',
				dl.tone === 'urgent'
					? 'bg-ochre-soft text-clay'
					: dl.tone === 'closed'
						? 'bg-paper text-ink-soft line-through'
						: 'bg-paper text-ink-soft'
			)}
		>
			{dl.text}
		</span>
	</header>

	<h3
		class="font-display text-ink group-hover:text-terracotta line-clamp-2 text-xl leading-tight font-semibold transition-colors"
		style="font-variation-settings: 'opsz' 36, 'wght' 600;"
	>
		{b.title}
	</h3>

	<div class="mt-auto space-y-3">
		<div class="flex items-end justify-between gap-3">
			<div>
				<p class="text-ink-soft text-[10px] tracking-wide uppercase">Prize pool</p>
				<p
					class="font-display text-ink text-2xl font-semibold tabular-nums"
					style="font-variation-settings: 'opsz' 144, 'wght' 600;"
				>
					{formatMoneyCompact(b.totalPrizePool, 'Le')}
				</p>
			</div>
			{#if b.compensationType !== 'FIXED'}
				<span
					class="border-bone bg-paper text-ink-soft rounded-full border px-2.5 py-1 text-[11px] font-medium"
				>
					{b.compensationType === 'RANGE' ? 'Range' : 'Open ask'}
				</span>
			{/if}
		</div>

		<div class="border-bone flex items-center justify-between gap-2 border-t pt-3">
			<p class="text-ink-soft truncate text-xs">
				<span class="text-ink/70">by</span>
				{sponsorName}
			</p>
			{#if b.skills.length > 0}
				<div class="flex items-center gap-1">
					{#each b.skills.slice(0, 2) as s (s.id)}
						<span class="bg-paper text-ink-soft rounded-full px-2 py-0.5 text-[10px] font-medium">
							{s.skill.name}
						</span>
					{/each}
					{#if b.skills.length > 2}
						<span class="text-ink-soft/60 text-[10px]">+{b.skills.length - 2}</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</a>
