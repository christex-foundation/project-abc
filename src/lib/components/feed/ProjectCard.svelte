<script lang="ts">
	import type { ProjectPublic } from '$lib/server/repositories/project.repo';
	import { formatMoneyCompact } from '$lib/utils';
	import { cn } from '$lib/utils';

	type Props = {
		project: ProjectPublic;
		class?: string;
	};

	let { project: p, class: className }: Props = $props();

	const STATUS_LABEL: Record<string, { text: string; tone: 'open' | 'soft' | 'closed' }> = {
		OPEN: { text: 'Accepting proposals', tone: 'open' },
		AWARDED: { text: 'Awarded', tone: 'soft' },
		ACTIVE: { text: 'In progress', tone: 'soft' },
		COMPLETED: { text: 'Completed', tone: 'closed' }
	};

	const status = $derived(STATUS_LABEL[p.status] ?? { text: p.status, tone: 'soft' as const });
	const sponsorName = $derived(
		p.company?.companyName ?? p.companyNameSnapshot ?? 'Anonymous sponsor'
	);
</script>

<a
	href={`/projects/${p.slug}`}
	class={cn(
		'fow-card group border-bone bg-cream relative flex h-full flex-col gap-4 rounded-2xl border p-5',
		className
	)}
>
	<header class="flex items-start justify-between gap-3">
		<span
			class="bg-forest-soft text-forest inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
		>
			<span class="bg-forest h-1.5 w-1.5 rounded-full"></span>
			Project
		</span>

		<span
			class={cn(
				'rounded-full px-2.5 py-1 text-[11px] font-medium',
				status.tone === 'open'
					? 'bg-forest-soft text-forest'
					: status.tone === 'closed'
						? 'bg-paper text-ink-soft'
						: 'bg-paper text-ink-soft'
			)}
		>
			{status.text}
		</span>
	</header>

	<h3
		class="font-display text-ink group-hover:text-terracotta line-clamp-2 text-xl leading-tight font-semibold transition-colors"
		style="font-variation-settings: 'opsz' 36, 'wght' 600;"
	>
		{p.title}
	</h3>

	<div class="mt-auto space-y-3">
		<div class="flex items-end justify-between gap-3">
			<div>
				<p class="text-ink-soft text-[10px] tracking-wide uppercase">Budget up to</p>
				<p
					class="font-display text-ink text-2xl font-semibold tabular-nums"
					style="font-variation-settings: 'opsz' 144, 'wght' 600;"
				>
					{formatMoneyCompact(p.budgetCap, 'Le')}
				</p>
			</div>
			{#if p.timeToComplete}
				<span
					class="border-bone bg-paper text-ink-soft rounded-full border px-2.5 py-1 text-[11px] font-medium"
				>
					{p.timeToComplete}
				</span>
			{/if}
		</div>

		<div class="border-bone flex items-center justify-between gap-2 border-t pt-3">
			<p class="text-ink-soft truncate text-xs">
				<span class="text-ink/70">by</span>
				{sponsorName}
			</p>
			{#if p.skills.length > 0}
				<div class="flex items-center gap-1">
					{#each p.skills.slice(0, 2) as s (s.id)}
						<span class="bg-paper text-ink-soft rounded-full px-2 py-0.5 text-[10px] font-medium">
							{s.skill.name}
						</span>
					{/each}
					{#if p.skills.length > 2}
						<span class="text-ink-soft/60 text-[10px]">+{p.skills.length - 2}</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</a>
