<script lang="ts">
	import { formatMoneyCompact } from '$lib/utils';
	import CountUp from './CountUp.svelte';

	type Props = {
		liveBounties: number;
		liveProjects: number;
		totalPaidMinor: number;
		winnersToday: number;
		currencyDisplay?: string;
	};

	let {
		liveBounties,
		liveProjects,
		totalPaidMinor,
		winnersToday,
		currencyDisplay = 'Le'
	}: Props = $props();

	const liveTotal = $derived(liveBounties + liveProjects);
</script>

<div class="grid gap-3 sm:grid-cols-3">
	<article
		class="border-bone bg-paper hover:border-ink/30 rounded-2xl border px-5 py-5 transition-colors"
	>
		<p
			class="text-ink-soft flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase"
		>
			<span class="fow-pulse bg-terracotta inline-block h-1.5 w-1.5 rounded-full"></span>
			Live now
		</p>
		<p
			class="font-display text-ink mt-3 text-5xl font-semibold tracking-tight"
			style="font-variation-settings: 'opsz' 144, 'wght' 600;"
		>
			<CountUp value={liveTotal} />
		</p>
		<p class="text-ink-soft mt-1 text-xs">
			{liveBounties} bounties · {liveProjects} projects
		</p>
	</article>

	<article
		class="border-bone bg-forest text-forest-soft hover:border-ochre rounded-2xl border px-5 py-5 transition-colors"
	>
		<p class="text-forest-soft/80 text-[11px] font-medium tracking-wide uppercase">
			Paid to freelancers
		</p>
		<p
			class="font-display text-cream mt-3 text-5xl font-semibold tracking-tight"
			style="font-variation-settings: 'opsz' 144, 'wght' 600;"
		>
			<CountUp value={totalPaidMinor} formatter={(n) => formatMoneyCompact(n, currencyDisplay)} />
		</p>
		<p class="text-forest-soft/80 mt-1 text-xs">All-time, completed payouts</p>
	</article>

	<article
		class="border-terracotta bg-terracotta text-cream rounded-2xl border px-5 py-5 transition-colors"
	>
		<p class="text-cream/80 text-[11px] font-medium tracking-wide uppercase">Won in 24h</p>
		<p
			class="font-display mt-3 text-5xl font-semibold tracking-tight"
			style="font-variation-settings: 'opsz' 144, 'wght' 600;"
		>
			<CountUp value={winnersToday} />
		</p>
		<p class="text-cream/75 mt-1 text-xs">Freelancers paid today</p>
	</article>
</div>
