<script lang="ts">
	import type { WinnerEvent } from '$lib/server/services/stats.service';
	import { formatMoneyCompact, formatRelative } from '$lib/utils';

	type Props = { winners: WinnerEvent[] };
	let { winners }: Props = $props();

	// Duplicate the items so the CSS marquee can loop seamlessly by translating
	// the strip by -50%.
	const reel = $derived(winners.length > 0 ? [...winners, ...winners] : []);
</script>

{#if winners.length === 0}
	<!-- Empty state: keep the rail so the layout doesn't jump after seeds land -->
	<div class="border-bone bg-paper/50 rounded-2xl border border-dashed px-5 py-4 text-center">
		<p class="text-ink-soft text-xs tracking-wide uppercase">No paid winners yet</p>
		<p class="text-ink-soft mt-1 text-sm">
			Be among the first. Browse open bounties and submit your link.
		</p>
	</div>
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
