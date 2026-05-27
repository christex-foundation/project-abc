<script lang="ts">
	import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let { data } = $props();

	function formatMoney(minor: number | null | undefined, currency: string) {
		if (minor == null) return '—';
		return `${currency} ${(minor / 100).toLocaleString()}`;
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

	const stats = $derived(data.stats);
	const recentBounties = $derived(data.bounties.slice(0, 5));
	const notifications = $derived(data.notifications);
	const hasBounties = $derived(data.bounties.length > 0);

	function statusVariant(s: string) {
		if (s === 'ACTIVE') return 'success' as const;
		if (s === 'CANCELLED') return 'destructive' as const;
		if (s === 'DRAFT') return 'secondary' as const;
		return 'outline' as const;
	}
</script>

<div class="space-y-6">
	<header class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold">Overview</h1>
			<p class="text-sm text-zinc-500">Your bounties, submissions, and escrow at a glance.</p>
		</div>
		<Button href="/bounties/create">+ Create</Button>
	</header>

	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardContent class="py-4">
				<div class="text-xs text-zinc-500 uppercase">Active bounties</div>
				<div class="text-2xl font-semibold">{stats.activeBountiesCount}</div>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="py-4">
				<div class="text-xs text-zinc-500 uppercase">Active projects</div>
				<div class="text-2xl font-semibold">{stats.activeProjectsCount}</div>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="py-4">
				<div class="text-xs text-zinc-500 uppercase">Total submissions</div>
				<div class="text-2xl font-semibold">{stats.totalSubmissions}</div>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="py-4">
				<div class="text-xs text-zinc-500 uppercase">Escrow funded</div>
				<div class="text-2xl font-semibold">
					{formatMoney(stats.totalEscrowFunded, stats.currency)}
				</div>
			</CardContent>
		</Card>
	</div>

	{#if hasBounties}
		<div class="grid gap-3 sm:grid-cols-3">
			<Card>
				<CardContent class="py-4">
					<div class="text-xs text-zinc-500 uppercase">Drafts</div>
					<div class="text-xl font-semibold">{stats.draftCount}</div>
				</CardContent>
			</Card>
			<Card>
				<CardContent class="py-4">
					<div class="text-xs text-zinc-500 uppercase">Funded</div>
					<div class="text-xl font-semibold">{stats.fundedCount}</div>
				</CardContent>
			</Card>
			<Card>
				<CardContent class="py-4">
					<div class="text-xs text-zinc-500 uppercase">Completed</div>
					<div class="text-xl font-semibold">{stats.completedCount}</div>
				</CardContent>
			</Card>
		</div>
	{/if}

	{#if !hasBounties}
		<EmptyState
			title="No bounties yet"
			description="Post your first bounty or project to start receiving submissions."
		>
			{#snippet action()}
				<Button href="/bounties/create">Create a bounty</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<Card>
			<CardHeader>
				<div class="flex items-center justify-between">
					<CardTitle class="text-base">Recent bounties</CardTitle>
					<a href="/dashboard/company/bounties" class="text-sm text-zinc-500 hover:underline">
						View all →
					</a>
				</div>
			</CardHeader>
			<CardContent class="space-y-2">
				{#each recentBounties as b (b.id)}
					<div
						class="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
					>
						<div class="min-w-0 flex-1">
							<div class="truncate text-sm font-medium">{b.title}</div>
							<div class="mt-1 flex flex-wrap items-center gap-1.5">
								<Badge variant={statusVariant(b.status)}>{b.status}</Badge>
								<Badge variant="outline">{b.type}</Badge>
								<span class="text-xs text-zinc-500">
									{formatMoney(b.totalPrizePool, b.currency)}
								</span>
							</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							href={b.status === 'DRAFT' || b.status === 'FUNDED'
								? `/bounties/${b.slug}`
								: `/dashboard/company/bounties/${b.id}/submissions`}
						>
							View
						</Button>
					</div>
				{/each}
			</CardContent>
		</Card>
	{/if}

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
