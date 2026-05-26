<script lang="ts">
	import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui';

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

	function fmtRelative(d: Date | string) {
		const ms = Date.now() - new Date(d).getTime();
		const mins = Math.floor(ms / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		if (days < 30) return `${days}d ago`;
		return new Date(d).toLocaleDateString();
	}

	const submissions = $derived(data.submissions);
	const earnings = $derived(data.earnings);
	const recommendations = $derived(data.recommendations);
	const notifications = $derived(data.notifications);

	const totalEarned = $derived(
		earnings.filter((e) => e.status === 'COMPLETED').reduce((s, e) => s + e.amount, 0)
	);
	const inTransit = $derived(
		earnings
			.filter((e) => e.status === 'PROCESSING' || e.status === 'PENDING')
			.reduce((s, e) => s + e.amount, 0)
	);
	const currency = $derived(earnings[0]?.currency ?? 'SLE');
	const activeCount = $derived(submissions.filter((s) => !s.bounty.isWinnersAnnounced).length);
	const winsCount = $derived(submissions.filter((s) => s.isWinner).length);
	const recentSubmissions = $derived(submissions.slice(0, 5));
</script>

<div class="space-y-6">
	<header class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold">Overview</h1>
			<p class="text-sm text-zinc-500">Earnings, active submissions, and matched bounties.</p>
		</div>
		<Button href="/bounties">Browse bounties</Button>
	</header>

	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardContent class="py-4">
				<div class="text-xs text-zinc-500 uppercase">Total earned</div>
				<div class="text-2xl font-semibold">{formatMoney(totalEarned, currency)}</div>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="py-4">
				<div class="text-xs text-zinc-500 uppercase">In transit</div>
				<div class="text-2xl font-semibold">{formatMoney(inTransit, currency)}</div>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="py-4">
				<div class="text-xs text-zinc-500 uppercase">Active submissions</div>
				<div class="text-2xl font-semibold">{activeCount}</div>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="py-4">
				<div class="text-xs text-zinc-500 uppercase">Wins</div>
				<div class="text-2xl font-semibold">{winsCount}</div>
			</CardContent>
		</Card>
	</div>

	<Card>
		<CardHeader>
			<div class="flex items-center justify-between">
				<CardTitle class="text-base">Matched to your skills</CardTitle>
				<a href="/dashboard/freelancer/recommendations" class="text-sm text-zinc-500 hover:underline">
					See all →
				</a>
			</div>
		</CardHeader>
		<CardContent>
			{#if recommendations.length === 0}
				<div class="space-y-3 py-4 text-center">
					<div class="text-sm text-zinc-600">
						Complete your profile — add a headline, bio, and at least one skill — and we'll match
						you to live bounties.
					</div>
					<Button href="/dashboard/freelancer/profile" size="sm">Complete your profile</Button>
				</div>
			{:else}
				<div class="grid gap-3 md:grid-cols-2">
					{#each recommendations as r (r.bounty.id)}
						<div class="rounded-md border p-3">
							<div class="flex items-start justify-between gap-2">
								<a href={`/bounties/${r.bounty.slug}`} class="text-sm font-medium hover:underline">
									{r.bounty.title}
								</a>
								<Badge variant="outline">{Math.round(r.matchScore * 100)}%</Badge>
							</div>
							<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
								<Badge variant="outline">{r.bounty.type}</Badge>
								<span>{formatMoney(r.bounty.totalPrizePool, r.bounty.currency)}</span>
								<span>Closes {daysUntil(r.bounty.submissionDeadline)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<div class="flex items-center justify-between">
				<CardTitle class="text-base">Recent submissions</CardTitle>
				<a href="/dashboard/freelancer/submissions" class="text-sm text-zinc-500 hover:underline">
					All submissions →
				</a>
			</div>
		</CardHeader>
		<CardContent class="space-y-2">
			{#if recentSubmissions.length === 0}
				<div class="py-4 text-center text-sm text-zinc-500">
					You haven't submitted to any bounties yet.
					<a href="/bounties" class="underline">Browse bounties</a>.
				</div>
			{:else}
				{#each recentSubmissions as s (s.id)}
					<div class="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
						<div class="min-w-0 flex-1">
							<a
								href={`/bounties/${s.bounty.slug}`}
								class="block truncate text-sm font-medium hover:underline"
							>
								{s.bounty.title}
							</a>
							<div class="mt-1 flex flex-wrap items-center gap-1.5">
								<Badge variant="outline">{s.bounty.type}</Badge>
								{#if s.isWinner}
									<Badge variant="success">Winner — pos {s.winnerPosition}</Badge>
								{:else if s.bounty.isWinnersAnnounced}
									<Badge variant="secondary">Not selected</Badge>
								{:else}
									<Badge variant="outline">Submitted</Badge>
								{/if}
								{#if s.prizeAmount != null}
									<span class="text-xs text-zinc-500">
										{formatMoney(s.prizeAmount, s.bounty.currency)}
									</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<div class="flex items-center justify-between">
				<CardTitle class="text-base">Recent activity</CardTitle>
				<a href="/notifications" class="text-sm text-zinc-500 hover:underline">See all →</a>
			</div>
		</CardHeader>
		<CardContent class="space-y-2">
			{#if notifications.length === 0}
				<div class="py-4 text-center text-sm text-zinc-500">No recent activity yet.</div>
			{:else}
				{#each notifications as n (n.id)}
					<a
						href={n.link ?? '/notifications'}
						class="block border-b py-2 last:border-0 hover:bg-zinc-50"
					>
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="text-sm font-medium">{n.title}</div>
								{#if n.message}
									<div class="truncate text-xs text-zinc-500">{n.message}</div>
								{/if}
							</div>
							<span class="shrink-0 text-xs text-zinc-400">{fmtRelative(n.createdAt)}</span>
						</div>
					</a>
				{/each}
			{/if}
		</CardContent>
	</Card>
</div>
