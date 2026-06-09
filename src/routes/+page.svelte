<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatMoneyCompact } from '$lib/utils';
	import type { BountyForFreelancer } from '$lib/server/repositories/bounty.repo';
	import KenteRule from '$lib/components/marketing/KenteRule.svelte';
	import StatPanel from '$lib/components/marketing/StatPanel.svelte';
	import EarnersTicker from '$lib/components/marketing/EarnersTicker.svelte';
	import CategoryChips from '$lib/components/marketing/CategoryChips.svelte';
	import BountyCard from '$lib/components/feed/BountyCard.svelte';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';

	let { data } = $props();

	let activeCategory = $state<string | null>(null);

	const home = $derived(data.home);
	const marketing = $derived(data.marketing);
	const activeFeed = $derived(home?.bountyFeed);

	function pickCategory(cat: { label: string; skillIds: string[] } | null) {
		if (!cat) {
			activeCategory = null;
			return;
		}
		activeCategory = cat.label;
		// Categories in the curated chip set don't yet have explicit skill IDs.
		// We just hand off to the list page; future iterations can hydrate
		// skillIds from a settings doc and pre-apply the filter.
		goto('/bounties');
	}
</script>

<!-- Hero's right-hand "live product" visual: a real bounty card floating over a
     strip of live platform numbers. Shared by both auth states. -->
{#snippet liveVisual(
	bounty: BountyForFreelancer | undefined,
	stats: {
		liveBounties: number;
		liveProjects: number;
		totalPaidMinor: number;
		winnersToday: number;
	}
)}
	<div class="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
		<div
			class="bg-terracotta/10 pointer-events-none absolute -top-10 -right-10 h-56 w-56 rounded-full blur-3xl"
		></div>
		<div
			class="bg-forest/10 pointer-events-none absolute -bottom-12 -left-10 h-56 w-56 rounded-full blur-3xl"
		></div>

		<div class="relative flex flex-wrap gap-2">
			<span
				class="border-bone bg-cream text-ink inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] font-medium shadow-[var(--shadow-card)]"
			>
				<span class="fow-pulse bg-terracotta h-1.5 w-1.5 rounded-full"></span>
				{stats.liveBounties + stats.liveProjects} live
			</span>
			<span
				class="border-bone bg-cream text-ink inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] font-medium tabular-nums shadow-[var(--shadow-card)]"
			>
				{formatMoneyCompact(stats.totalPaidMinor, 'Le')} paid
			</span>
			{#if stats.winnersToday > 0}
				<span
					class="border-bone bg-cream text-ink inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] font-medium tabular-nums shadow-[var(--shadow-card)]"
				>
					{stats.winnersToday} won today
				</span>
			{/if}
		</div>

		{#if bounty}
			<div class="relative mt-4">
				<BountyCard {bounty} />
			</div>
		{/if}
	</div>
{/snippet}

{#if home}
	<!-- ─── Authenticated home ──────────────────────────────────────────────── -->
	<div class="fow-reveal space-y-12 pt-2">
		<!-- HERO -->
		<section class="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]" data-reveal-step="1">
			<div class="max-w-xl">
				<p
					class="text-ink-soft inline-flex items-center gap-2 font-mono text-[12px] tracking-wide uppercase"
				>
					<span class="fow-pulse bg-terracotta h-1.5 w-1.5 rounded-full"></span>
					Open now in Salone
				</p>
				<h1 class="fow-display text-ink mt-4 text-6xl sm:text-7xl lg:text-8xl">
					The work <span class="text-terracotta">that pays</span>.
				</h1>
				<p class="text-ink-soft mt-5 max-w-md text-base sm:text-lg">
					Paid bounties and longer projects from companies hiring across Sierra Leone. Submit a
					link. Get paid by mobile money or bank.
				</p>
				<div class="mt-7 flex flex-wrap items-center gap-3">
					<a
						href="/bounties"
						class="bg-ink text-cream hover:bg-terracotta inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
					>
						Browse bounties
						<ArrowUpRight class="h-4 w-4" />
					</a>
				</div>
			</div>

			{@render liveVisual(home.bountyFeed?.items?.[0], home.stats)}
		</section>

		<!-- STATS -->
		<section data-reveal-step="2">
			<StatPanel
				liveBounties={home.stats.liveBounties}
				liveBountyValueMinor={home.stats.liveBountyValueMinor}
				totalPaidMinor={home.stats.totalPaidMinor}
				winnersToday={home.stats.winnersToday}
				currencyDisplay="Le"
			/>
		</section>

		<div data-reveal-step="3">
			<KenteRule />
		</div>

		<!-- TICKER -->
		<section data-reveal-step="4" aria-label="Recent winners">
			<EarnersTicker winners={home.stats.winners} featured={home.featuredBounty} />
		</section>

		<!-- CATEGORY CHIPS + FEED SWITCH -->
		<section data-reveal-step="5" class="space-y-5">
			<div>
				<h2 class="fow-display text-ink text-4xl">Find your next win</h2>
				<p class="text-ink-soft mt-1 text-sm">
					{home.stats.liveBounties} bounties open right now
				</p>
			</div>

			<CategoryChips activeLabel={activeCategory} onSelect={pickCategory} />
		</section>

		<!-- FEED -->
		<section data-reveal-step="6" class="space-y-4">
			{#if !activeFeed || activeFeed.items.length === 0}
				<div
					class="border-bone bg-paper/50 rounded-[var(--radius-card-lg)] border border-dashed px-6 py-12 text-center"
				>
					<p class="fow-display text-ink-soft text-3xl">No bounties open yet</p>
					<p class="text-ink-soft mt-2 text-sm">Check back soon. New bounties go up every week.</p>
				</div>
			{:else}
				<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{#each activeFeed.items as b (b.id)}
						<BountyCard bounty={b} />
					{/each}
				</div>
				<div class="flex justify-center pt-2">
					<a
						href="/bounties"
						class="border-bone bg-cream text-ink hover:border-ink inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors"
					>
						See all bounties ({activeFeed.total})
						<ArrowUpRight class="h-4 w-4" />
					</a>
				</div>
			{/if}
		</section>
	</div>
{:else}
	<!-- ─── Public marketing landing (logged-out) ────────────────────────────── -->
	<div class="fow-reveal space-y-14 py-6">
		<!-- HERO -->
		<section class="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]" data-reveal-step="1">
			<div class="max-w-xl">
				<p class="text-ink-soft font-mono text-[12px] tracking-wide uppercase">
					Salone · pan-West Africa
				</p>
				<h1 class="fow-display text-ink mt-4 text-6xl sm:text-7xl lg:text-8xl">
					Work <span class="text-terracotta">that pays</span>, in Sierra Leone.
				</h1>
				<p class="text-ink-soft mt-5 max-w-md text-base sm:text-lg">
					Companies post bounties. Freelancers compete to win. Funds sit in escrow, payouts go to
					mobile money or bank, and we take no fee while we build.
				</p>
				<div class="mt-7 flex flex-wrap items-center gap-3">
					<a
						href="/bounties"
						class="bg-ink text-cream hover:bg-terracotta inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
					>
						Browse bounties
						<ArrowUpRight class="h-4 w-4" />
					</a>
					<a
						href="/register"
						class="border-bone bg-cream text-ink hover:border-ink inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors"
					>
						Get started
					</a>
				</div>
			</div>

			{#if marketing}
				{@render liveVisual(marketing.bounties?.[0], marketing.stats)}
			{/if}
		</section>

		<div data-reveal-step="2"><KenteRule /></div>

		{#if marketing && marketing.stats.winners.length > 0}
			<section data-reveal-step="3" aria-label="Recent winners">
				<EarnersTicker winners={marketing.stats.winners} />
			</section>
		{/if}

		<!-- VALUE PROPS -->
		<section data-reveal-step="4" class="grid gap-4 md:grid-cols-3">
			<article
				class="border-bone fow-lift rounded-[var(--radius-card)] border bg-white p-6 shadow-[var(--shadow-card)]"
			>
				<p class="text-terracotta font-mono text-[11px] tracking-wide uppercase">For freelancers</p>
				<h3 class="fow-display text-ink mt-3 text-3xl">Pick. Submit. Get paid.</h3>
				<p class="text-ink-soft mt-2 text-sm">
					Find bounties that fit your skills, submit a link, and cash out through Afrimoney, Orange
					Money, or your bank.
				</p>
			</article>
			<article
				class="border-bone fow-lift rounded-[var(--radius-card)] border bg-white p-6 shadow-[var(--shadow-card)]"
			>
				<p class="text-forest font-mono text-[11px] tracking-wide uppercase">For companies</p>
				<h3 class="fow-display text-ink mt-3 text-3xl">Post once. Pay the winner.</h3>
				<p class="text-ink-soft mt-2 text-sm">
					Fund the prize into escrow and it stays there until you announce. No payroll, no
					contracts, just the work you asked for.
				</p>
			</article>
			<article
				class="border-bone fow-lift rounded-[var(--radius-card)] border bg-white p-6 shadow-[var(--shadow-card)]"
			>
				<p class="text-ochre font-mono text-[11px] tracking-wide uppercase">Built for the market</p>
				<h3 class="fow-display text-ink mt-3 text-3xl">Mobile-first. Power-cut safe.</h3>
				<p class="text-ink-soft mt-2 text-sm">
					It works on a patchy connection and auto-saves your drafts, so a power cut never costs you
					the brief.
				</p>
			</article>
		</section>

		<!-- OPEN RIGHT NOW -->
		{#if marketing && marketing.bounties.length > 0}
			<section data-reveal-step="5" class="space-y-4">
				<div class="flex flex-wrap items-end justify-between gap-3">
					<h2 class="fow-display text-ink text-4xl">Open right now</h2>
					<a
						href="/bounties"
						class="text-ink-soft hover:text-terracotta inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
					>
						See all bounties
						<ArrowUpRight class="h-4 w-4" />
					</a>
				</div>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each marketing.bounties as b (b.id)}
						<BountyCard bounty={b} />
					{/each}
				</div>
			</section>
		{/if}
	</div>
{/if}
