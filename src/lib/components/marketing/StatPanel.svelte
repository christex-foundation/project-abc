<script lang="ts">
	import { formatMoneyCompact } from '$lib/utils';
	import CountUp from './CountUp.svelte';

	type Props = {
		liveBounties: number;
		liveBountyValueMinor: number;
		totalPaidMinor: number;
		winnersToday: number;
		currencyDisplay?: string;
	};

	let {
		liveBounties,
		liveBountyValueMinor,
		totalPaidMinor,
		winnersToday,
		currencyDisplay = 'Le'
	}: Props = $props();
</script>

<div class="flex flex-col gap-3 sm:flex-row">
	<article
		class="border-bone bg-paper fow-lift flex-1 rounded-[var(--radius-card)] border px-5 py-5 shadow-[var(--shadow-card)] transition-colors"
	>
		<p
			class="text-ink-soft flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-wide uppercase"
		>
			<span class="fow-pulse bg-terracotta inline-block h-1.5 w-1.5 rounded-full"></span>
			Up for grabs
		</p>
		<p class="fow-display text-ink mt-3 text-4xl tabular-nums sm:text-6xl">
			<CountUp
				value={liveBountyValueMinor}
				formatter={(n) => formatMoneyCompact(n, currencyDisplay)}
			/>
		</p>
		<p class="text-ink-soft mt-1 text-xs">
			across {liveBounties} open {liveBounties === 1 ? 'bounty' : 'bounties'}
		</p>
	</article>

	{#if totalPaidMinor > 0}
		<article
			class="border-bone bg-forest text-forest-soft fow-lift flex-1 rounded-[var(--radius-card)] border px-5 py-5 shadow-[var(--shadow-card)] transition-colors"
		>
			<p class="text-forest-soft/80 font-mono text-[11px] font-medium tracking-wide uppercase">
				Paid to freelancers
			</p>
			<p class="fow-display text-cream mt-3 text-4xl tabular-nums sm:text-6xl">
				<CountUp value={totalPaidMinor} formatter={(n) => formatMoneyCompact(n, currencyDisplay)} />
			</p>
			<p class="text-forest-soft/80 mt-1 text-xs">All-time, completed payouts</p>
		</article>
	{/if}

	{#if winnersToday > 0}
		<article
			class="border-terracotta bg-terracotta text-cream fow-lift flex-1 rounded-[var(--radius-card)] border px-5 py-5 shadow-[var(--shadow-card)] transition-colors"
		>
			<p class="text-cream/80 font-mono text-[11px] font-medium tracking-wide uppercase">
				Won in 24h
			</p>
			<p class="fow-display text-cream mt-3 text-4xl tabular-nums sm:text-6xl">
				<CountUp value={winnersToday} />
			</p>
			<p class="text-cream/75 mt-1 text-xs">Freelancers paid today</p>
		</article>
	{/if}
</div>
