<script lang="ts">
	import { goto } from '$app/navigation';
	import KenteRule from '$lib/components/marketing/KenteRule.svelte';
	import StatPanel from '$lib/components/marketing/StatPanel.svelte';
	import EarnersTicker from '$lib/components/marketing/EarnersTicker.svelte';
	import CategoryChips from '$lib/components/marketing/CategoryChips.svelte';
	import FeedSwitch from '$lib/components/feed/FeedSwitch.svelte';
	import BountyCard from '$lib/components/feed/BountyCard.svelte';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';

	let { data } = $props();

	let feedMode = $state<'BOUNTY' | 'PROJECT'>('BOUNTY');
	let activeCategory = $state<string | null>(null);

	const home = $derived(data.home);
	const activeFeed = $derived(feedMode === 'BOUNTY' ? home?.bountyFeed : home?.projectFeed);
	const seeAllHref = $derived(feedMode === 'BOUNTY' ? '/bounties' : '/projects');

	function pickCategory(cat: { label: string; skillIds: string[] } | null) {
		if (!cat) {
			activeCategory = null;
			return;
		}
		activeCategory = cat.label;
		// Categories in the curated chip set don't yet have explicit skill IDs.
		// We just hand off to the list page; future iterations can hydrate
		// skillIds from a settings doc and pre-apply the filter.
		const target = feedMode === 'BOUNTY' ? '/bounties' : '/projects';
		goto(target);
	}
</script>

{#if home}
	<!-- ─── Authenticated home ──────────────────────────────────────────────── -->
	<div class="fow-reveal space-y-10 pt-2">
		<!-- HERO -->
		<section
			class="border-bone bg-paper relative overflow-hidden rounded-3xl border px-6 py-12 sm:px-10 sm:py-16"
			data-reveal-step="1"
		>
			<div class="pointer-events-none absolute -top-24 -right-20 hidden sm:block">
				<div class="bg-terracotta/10 h-72 w-72 rounded-full blur-3xl"></div>
			</div>
			<div class="pointer-events-none absolute -bottom-20 -left-24 hidden sm:block">
				<div class="bg-forest/10 h-72 w-72 rounded-full blur-3xl"></div>
			</div>

			<div class="relative max-w-2xl">
				<p
					class="border-bone bg-cream text-ink-soft inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide uppercase"
				>
					<span class="fow-pulse bg-terracotta h-1.5 w-1.5 rounded-full"></span>
					Open now in Salone
				</p>
				<h1
					class="font-display text-ink mt-5 text-5xl leading-[1.02] font-semibold tracking-tight sm:text-7xl"
					style="font-variation-settings: 'opsz' 144, 'wght' 600;"
				>
					The work
					<span class="text-terracotta italic">that pays</span>.
				</h1>
				<p class="text-ink-soft mt-5 max-w-xl text-base sm:text-lg">
					Browse paid bounties and longer projects from companies hiring across Sierra Leone. Submit
					a link. Get paid via mobile money or bank.
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
						href="/projects"
						class="border-bone bg-cream text-ink hover:border-ink inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors"
					>
						See projects
					</a>
				</div>
			</div>
		</section>

		<!-- STATS -->
		<section data-reveal-step="2">
			<StatPanel
				liveBounties={home.stats.liveBounties}
				liveProjects={home.stats.liveProjects}
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
			<EarnersTicker winners={home.stats.winners} />
		</section>

		<!-- CATEGORY CHIPS + FEED SWITCH -->
		<section data-reveal-step="5" class="space-y-5">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2
						class="font-display text-ink text-3xl font-semibold tracking-tight"
						style="font-variation-settings: 'opsz' 144, 'wght' 600;"
					>
						Find your next win
					</h2>
					<p class="text-ink-soft mt-1 text-sm">
						{home.stats.liveBounties} bounties · {home.stats.liveProjects} projects open right now
					</p>
				</div>
				<FeedSwitch
					value={feedMode}
					onChange={(v) => (feedMode = v)}
					bountyCount={home.stats.liveBounties}
					projectCount={home.stats.liveProjects}
				/>
			</div>

			<CategoryChips activeLabel={activeCategory} onSelect={pickCategory} />
		</section>

		<!-- FEED -->
		<section data-reveal-step="6" class="space-y-4">
			{#if !activeFeed || activeFeed.items.length === 0}
				<div
					class="border-bone bg-paper/50 rounded-2xl border border-dashed px-6 py-12 text-center"
				>
					<p
						class="font-display text-ink-soft text-2xl"
						style="font-variation-settings: 'opsz' 144, 'wght' 500;"
					>
						No {feedMode === 'BOUNTY' ? 'bounties' : 'projects'} open yet
					</p>
					<p class="text-ink-soft mt-2 text-sm">
						Check back soon — new {feedMode === 'BOUNTY' ? 'bounties' : 'projects'} are posted weekly.
					</p>
				</div>
			{:else}
				<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{#each activeFeed.items as b (b.id)}
						<BountyCard bounty={b} />
					{/each}
				</div>
				<div class="flex justify-center pt-2">
					<a
						href={seeAllHref}
						class="border-bone bg-cream text-ink hover:border-ink inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors"
					>
						See all {feedMode === 'BOUNTY' ? 'bounties' : 'projects'} ({activeFeed.total})
						<ArrowUpRight class="h-4 w-4" />
					</a>
				</div>
			{/if}
		</section>
	</div>
{:else}
	<!-- ─── Public marketing landing (logged-out) ────────────────────────────── -->
	<section class="space-y-12 py-8">
		<header class="space-y-5 text-center">
			<p
				class="border-bone bg-paper text-ink-soft inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide uppercase"
			>
				Salone · pan-West Africa
			</p>
			<h1
				class="font-display text-ink mx-auto max-w-3xl text-5xl leading-[1.02] font-semibold tracking-tight md:text-7xl"
				style="font-variation-settings: 'opsz' 144, 'wght' 600;"
			>
				Work
				<span class="text-terracotta italic">that pays</span>
				— in Sierra Leone.
			</h1>
			<p class="text-ink-soft mx-auto max-w-2xl text-lg">
				Companies post bounties; freelancers compete to win. Escrowed funds, mobile-money payouts,
				no platform fees while we build.
			</p>
			<div class="flex justify-center gap-3">
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
		</header>

		<KenteRule />

		<section class="grid gap-4 md:grid-cols-3">
			<article
				class="border-bone bg-paper hover:border-ink/30 rounded-2xl border p-6 transition-colors"
			>
				<p class="text-terracotta text-[11px] tracking-wide uppercase">For freelancers</p>
				<h3
					class="font-display text-ink mt-3 text-2xl font-semibold"
					style="font-variation-settings: 'opsz' 144, 'wght' 600;"
				>
					Pick. Submit. Get paid.
				</h3>
				<p class="text-ink-soft mt-2 text-sm">
					Pick bounties matched to your skills. Submit a link. Cash out via Afrimoney, Orange Money,
					or bank.
				</p>
			</article>
			<article
				class="border-bone bg-paper hover:border-ink/30 rounded-2xl border p-6 transition-colors"
			>
				<p class="text-forest text-[11px] tracking-wide uppercase">For companies</p>
				<h3
					class="font-display text-ink mt-3 text-2xl font-semibold"
					style="font-variation-settings: 'opsz' 144, 'wght' 600;"
				>
					Post once. Fund once. Pay winners.
				</h3>
				<p class="text-ink-soft mt-2 text-sm">
					Monime escrow holds the prize pool until you announce. No payroll, no contracts — just
					results.
				</p>
			</article>
			<article
				class="border-bone bg-paper hover:border-ink/30 rounded-2xl border p-6 transition-colors"
			>
				<p class="text-ochre text-[11px] tracking-wide uppercase">Built for the market</p>
				<h3
					class="font-display text-ink mt-3 text-2xl font-semibold"
					style="font-variation-settings: 'opsz' 144, 'wght' 600;"
				>
					Mobile-first. Power-cut safe.
				</h3>
				<p class="text-ink-soft mt-2 text-sm">
					Works on patchy connections. Auto-saves drafts so a power cut doesn't cost you the brief.
				</p>
			</article>
		</section>
	</section>
{/if}
