<script lang="ts">
	import type { WinnerEvent } from '$lib/server/services/stats.service';
	import { formatMoneyCompact, formatRelative } from '$lib/utils';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';

	type Props = {
		winners: WinnerEvent[];
		// A live bounty to spotlight when there are no winners yet, turning the
		// empty rail into a "be the first" prompt instead of a dead end.
		featured?: { slug: string; title: string } | null;
	};
	let { winners, featured = null }: Props = $props();

	// Duplicate the items so the CSS marquee can loop seamlessly by translating
	// the strip by -50%.
	const reel = $derived(winners.length > 0 ? [...winners, ...winners] : []);
</script>

{#if winners.length === 0}
	<!-- No winners yet: invite the first one instead of showing a dead rail.
	     Spotlights a live bounty when we have one to point at. -->
	<a
		href={featured ? `/bounties/${featured.slug}` : '/bounties'}
		class="border-ochre bg-ochre-soft/50 hover:border-ochre group flex flex-col items-center gap-3 rounded-2xl border px-6 py-5 text-center transition-colors sm:flex-row sm:justify-between sm:text-left"
	>
		<div>
			<p class="fow-display text-ink text-2xl">Be the first name on the board</p>
			<p class="text-ink-soft mt-1 text-sm">
				{#if featured}
					No one's cashed out yet — start with <span class="text-ink font-medium"
						>“{featured.title}”</span
					> and submit your link.
				{:else}
					No one's cashed out yet. Pick an open bounty, submit your link, and claim the first win.
				{/if}
			</p>
		</div>
		<span
			class="bg-ink text-cream group-hover:bg-terracotta inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors"
		>
			{featured ? 'Start this bounty' : 'Browse bounties'}
			<ArrowUpRight class="h-4 w-4" />
		</span>
	</a>
{:else}
	<div
		class="group border-bone bg-ink text-cream relative overflow-hidden rounded-2xl border py-3"
		aria-label="Recent winners"
	>
		<div
			class="from-ink pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r to-transparent"
		></div>
		<div
			class="from-ink pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l to-transparent"
		></div>

		<div class="fow-marquee flex w-max items-center gap-8 px-6">
			{#each reel as w, i (`${w.id}-${i}`)}
				<a
					href={w.bountySlug ? `/bounties/${w.bountySlug}` : '/bounties'}
					class="hover:text-ochre flex shrink-0 items-center gap-3 text-sm transition-colors"
				>
					<span
						class="bg-terracotta text-cream inline-flex h-6 items-center justify-center rounded-full px-2 font-mono text-[11px] font-semibold tracking-wide uppercase"
					>
						{w.bountyType === 'PROJECT' ? 'Project' : 'Bounty'}
					</span>
					<span class="font-medium">{w.maskedName}</span>
					<span class="text-cream/60">won</span>
					<span class="text-ochre font-mono font-semibold tabular-nums">
						{formatMoneyCompact(w.amountMinor, 'Le')}
					</span>
					<span class="text-cream/60">·</span>
					<span class="text-cream/85 max-w-[18ch] truncate">{w.bountyTitle}</span>
					<span class="text-cream/40">·</span>
					<span class="text-cream/55 text-xs">{formatRelative(w.settledAt)}</span>
				</a>
			{/each}
		</div>
	</div>
{/if}
