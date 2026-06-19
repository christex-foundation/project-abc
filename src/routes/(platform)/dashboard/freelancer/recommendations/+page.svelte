<script lang="ts">
	import { Badge, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui';
	import { PROVINCE_LABEL } from '$lib/constants/geo';
	import Lock from '@lucide/svelte/icons/lock';

	let { data } = $props();

	function formatMoney(minor: number | null | undefined, currency: string) {
		if (minor == null) return '—';
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	function daysUntil(d: Date | string): string {
		const ms = new Date(d).getTime() - Date.now();
		if (ms <= 0) return 'closed';
		const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
		return `${days}d`;
	}

	function scoreLabel(score: number): { label: string; tone: 'success' | 'outline' | 'secondary' } {
		const pct = Math.round(score * 100);
		if (pct >= 70) return { label: `${pct}% match`, tone: 'success' };
		if (pct >= 40) return { label: `${pct}% match`, tone: 'outline' };
		return { label: `${pct}% match`, tone: 'secondary' };
	}

	const recs = $derived(data.recommendations);
</script>

<div class="space-y-6">
	<header class="space-y-1">
		<h1 class="fow-display text-ink text-3xl">Recommended for you</h1>
		<p class="text-ink-soft text-sm">
			Bounties matched to your skills and headline.
			<a href="/dashboard/freelancer/profile" class="underline">Update your profile</a> to refine these.
		</p>
	</header>

	{#if recs.length === 0}
		<Card>
			<CardContent class="space-y-3 py-12 text-center">
				<div class="text-ink">No recommendations yet.</div>
				<div class="text-ink-soft text-sm">
					Complete your profile — add a headline, bio, and at least one skill — and we'll match you
					to live bounties.
				</div>
				<div>
					<a
						href="/dashboard/freelancer/profile"
						class="bg-ink text-cream hover:bg-terracotta inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
					>
						Complete your profile
					</a>
				</div>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-4 md:grid-cols-2">
			{#each recs as r (r.bounty.id)}
				{@const score = scoreLabel(r.matchScore)}
				<Card>
					<CardHeader>
						<div class="flex flex-wrap items-start justify-between gap-2">
							<CardTitle class="text-base">
								<a href={`/bounties/${r.bounty.slug}`} class="hover:underline">
									{r.bounty.title}
								</a>
							</CardTitle>
							<Badge variant={score.tone}>{score.label}</Badge>
						</div>
						<div class="text-ink-soft text-xs">
							{r.bounty.company?.companyName ?? r.bounty.companyNameSnapshot ?? 'A company'}
						</div>
					</CardHeader>
					<CardContent class="space-y-3 text-sm">
						<div class="text-ink-soft flex flex-wrap items-center gap-4">
							<span>
								<strong class="tabular-nums"
									>{formatMoney(r.bounty.totalPrizePool, r.bounty.currency)}</strong
								>
								<span class="text-ink-soft">prize pool</span>
							</span>
							<span>
								<Badge variant="outline">{r.bounty.type}</Badge>
							</span>
							<span>
								Closes in <strong>{daysUntil(r.bounty.submissionDeadline)}</strong>
							</span>
						</div>
						{#if r.bounty.isPinLocked || r.bounty.targetProvinces.length > 0}
							<div class="flex flex-wrap items-center gap-1.5">
								{#if r.bounty.isPinLocked}
									<Badge variant="secondary"><Lock class="mr-1 h-3 w-3" />PIN required</Badge>
								{/if}
								{#each r.bounty.targetProvinces as p (p)}
									<Badge variant="outline">{PROVINCE_LABEL[p]}</Badge>
								{/each}
							</div>
						{/if}
						{#if r.bounty.skills.length > 0}
							<div class="flex flex-wrap gap-1.5">
								{#each r.bounty.skills.slice(0, 6) as bs (bs.id)}
									<Badge variant={bs.isRequired ? 'default' : 'secondary'}>
										{bs.skill.name}
									</Badge>
								{/each}
								{#if r.bounty.skills.length > 6}
									<Badge variant="outline">+{r.bounty.skills.length - 6}</Badge>
								{/if}
							</div>
						{/if}
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>
