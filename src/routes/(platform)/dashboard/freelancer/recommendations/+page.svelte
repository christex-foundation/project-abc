<script lang="ts">
	import { Badge, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui';

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
		<h1 class="text-2xl font-semibold">Recommended for you</h1>
		<p class="text-sm text-zinc-500">
			Bounties matched to your skills and headline.
			<a href="/dashboard/freelancer/profile" class="underline">Update your profile</a> to refine these.
		</p>
	</header>

	{#if recs.length === 0}
		<Card>
			<CardContent class="space-y-3 py-12 text-center">
				<div class="text-zinc-700">No recommendations yet.</div>
				<div class="text-sm text-zinc-500">
					Complete your profile — add a headline, bio, and at least one skill — and we'll match you
					to live bounties.
				</div>
				<div>
					<a
						href="/dashboard/freelancer/profile"
						class="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
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
						<div class="text-xs text-zinc-500">
							{r.bounty.company.companyName ?? 'A company'}
						</div>
					</CardHeader>
					<CardContent class="space-y-3 text-sm">
						<div class="flex flex-wrap items-center gap-4 text-zinc-600">
							<span>
								<strong>{formatMoney(r.bounty.totalPrizePool, r.bounty.currency)}</strong>
								<span class="text-zinc-400">prize pool</span>
							</span>
							<span>
								<Badge variant="outline">{r.bounty.type}</Badge>
							</span>
							<span>
								Closes in <strong>{daysUntil(r.bounty.submissionDeadline)}</strong>
							</span>
						</div>
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
