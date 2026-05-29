<script lang="ts">
	import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui';
	import KenteRule from '$lib/components/marketing/KenteRule.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { formatMoneyCompact, formatRelative } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';

	let { data } = $props();

	function formatMoneyMajor(minor: number | null | undefined, currency: string) {
		if (minor == null) return '—';
		return `${currency} ${(minor / 100).toLocaleString()}`;
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

<div class="fow-reveal space-y-8">
	<!-- Hero header -->
	<header
		class="border-bone bg-paper relative overflow-hidden rounded-3xl border px-6 py-8 sm:px-10"
		data-reveal-step="1"
	>
		<div class="pointer-events-none absolute -top-16 -right-16">
			<div class="bg-forest/10 h-56 w-56 rounded-full blur-3xl"></div>
		</div>
		<div class="relative flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-ink-soft text-[11px] tracking-wide uppercase">Your desk</p>
				<h1
					class="font-display text-ink mt-2 text-4xl font-semibold tracking-tight sm:text-5xl"
					style="font-variation-settings: 'opsz' 144, 'wght' 600;"
				>
					Bounties, escrow,
					<span class="text-terracotta italic">and winners.</span>
				</h1>
			</div>
			<Button
				href="/create"
				class="bg-ink text-cream hover:bg-terracotta inline-flex items-center gap-1.5"
			>
				{#snippet children()}
					<Plus class="h-4 w-4" />
					<span>Post work</span>
				{/snippet}
			</Button>
		</div>
	</header>

	<!-- Stat band -->
	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-reveal-step="2">
		<div class="border-bone bg-cream rounded-2xl border px-5 py-5">
			<p class="text-ink-soft text-[11px] tracking-wide uppercase">Active bounties</p>
			<p
				class="font-display text-ink mt-2 text-3xl font-semibold tabular-nums"
				style="font-variation-settings: 'opsz' 144, 'wght' 600;"
			>
				{stats.activeBountiesCount}
			</p>
		</div>
		<a
			href="/dashboard/company/projects"
			class="border-bone bg-cream hover:border-ink rounded-2xl border px-5 py-5 transition-colors"
		>
			<p class="text-ink-soft text-[11px] tracking-wide uppercase">Active projects</p>
			<p
				class="font-display text-ink mt-2 text-3xl font-semibold tabular-nums"
				style="font-variation-settings: 'opsz' 144, 'wght' 600;"
			>
				{stats.activeProjectsCount}
			</p>
		</a>
		<div class="border-bone bg-cream rounded-2xl border px-5 py-5">
			<p class="text-ink-soft text-[11px] tracking-wide uppercase">Total submissions</p>
			<p
				class="font-display text-ink mt-2 text-3xl font-semibold tabular-nums"
				style="font-variation-settings: 'opsz' 144, 'wght' 600;"
			>
				{stats.totalSubmissions}
			</p>
		</div>
		<div class="border-bone bg-forest text-forest-soft rounded-2xl border px-5 py-5">
			<p class="text-forest-soft/70 text-[11px] tracking-wide uppercase">Escrow funded</p>
			<p
				class="font-display text-cream mt-2 text-3xl font-semibold tabular-nums"
				style="font-variation-settings: 'opsz' 144, 'wght' 600;"
			>
				{formatMoneyCompact(stats.totalEscrowFunded, 'Le')}
			</p>
		</div>
	</div>

	{#if hasBounties}
		<div class="grid gap-3 sm:grid-cols-3" data-reveal-step="3">
			<div class="border-bone bg-paper rounded-xl border px-4 py-3">
				<p class="text-ink-soft text-[11px] tracking-wide uppercase">Drafts</p>
				<p class="font-display text-ink mt-1 text-xl font-semibold tabular-nums">
					{stats.draftCount}
				</p>
			</div>
			<div class="border-bone bg-paper rounded-xl border px-4 py-3">
				<p class="text-ink-soft text-[11px] tracking-wide uppercase">Funded</p>
				<p class="font-display text-ink mt-1 text-xl font-semibold tabular-nums">
					{stats.fundedCount}
				</p>
			</div>
			<div class="border-bone bg-paper rounded-xl border px-4 py-3">
				<p class="text-ink-soft text-[11px] tracking-wide uppercase">Completed</p>
				<p class="font-display text-ink mt-1 text-xl font-semibold tabular-nums">
					{stats.completedCount}
				</p>
			</div>
		</div>
	{/if}

	<div data-reveal-step="4">
		<KenteRule />
	</div>

	{#if !hasBounties}
		<EmptyState
			title="No bounties yet"
			description="Post your first bounty or project to start receiving submissions."
		>
			{#snippet action()}
				<Button href="/create">Post work</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<Card data-reveal-step="5">
			<CardHeader>
				<div class="flex items-center justify-between">
					<CardTitle class="text-base">Recent bounties</CardTitle>
					<a
						href="/dashboard/company/bounties"
						class="text-ink-soft hover:text-ink text-sm hover:underline"
					>
						View all →
					</a>
				</div>
			</CardHeader>
			<CardContent class="space-y-2">
				{#each recentBounties as b (b.id)}
					<div
						class="border-bone flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
					>
						<div class="min-w-0 flex-1">
							<div class="text-ink truncate text-sm font-medium">{b.title}</div>
							<div class="mt-1 flex flex-wrap items-center gap-1.5">
								<Badge variant={statusVariant(b.status)}>{b.status}</Badge>
								<Badge variant="outline">{b.type}</Badge>
								<span class="text-ink-soft font-mono text-xs tabular-nums">
									{formatMoneyMajor(b.totalPrizePool, b.currency)}
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
				<a href="/notifications" class="text-ink-soft hover:text-ink text-sm hover:underline"
					>See all →</a
				>
			</div>
		</CardHeader>
		<CardContent class="space-y-2">
			{#if notifications.length === 0}
				<div class="text-ink-soft py-4 text-center text-sm">No recent activity yet.</div>
			{:else}
				{#each notifications as n (n.id)}
					<a
						href={n.link ?? '/notifications'}
						class="border-bone hover:bg-paper block border-b py-2 last:border-0"
					>
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="text-ink text-sm font-medium">{n.title}</div>
								{#if n.message}
									<div class="text-ink-soft truncate text-xs">{n.message}</div>
								{/if}
							</div>
							<span class="text-ink-soft/60 shrink-0 text-xs">{formatRelative(n.createdAt)}</span>
						</div>
					</a>
				{/each}
			{/if}
		</CardContent>
	</Card>
</div>
