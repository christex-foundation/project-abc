<script lang="ts">
	import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui';
	import RaiseDisputeButton from '$lib/components/shared/RaiseDisputeButton.svelte';

	let { data } = $props();

	let activeTab = $state<'bounties' | 'projects'>('bounties');

	function formatMoney(minor: number | null | undefined, currency: string) {
		if (minor == null) return '—';
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString();
	}

	const submissions = $derived(data.submissions);
	const proposals = $derived(data.proposals);
	const contractedProjects = $derived(data.contractedProjects);

	function proposalStatusVariant(s: string) {
		if (s === 'AWARDED') return 'success' as const;
		if (s === 'REJECTED' || s === 'WITHDRAWN') return 'secondary' as const;
		return 'outline' as const;
	}

	const tabBtn = (active: boolean) =>
		`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-ink text-cream' : 'text-ink-soft hover:bg-paper'}`;
</script>

<div class="space-y-6">
	<header class="space-y-1">
		<h1 class="fow-display text-ink text-3xl">Your work</h1>
		<p class="text-ink-soft text-sm">Bounties and projects you've taken on.</p>
	</header>

	<div class="flex gap-2">
		<button class={tabBtn(activeTab === 'bounties')} onclick={() => (activeTab = 'bounties')}>
			Bounties ({submissions.length})
		</button>
		<button class={tabBtn(activeTab === 'projects')} onclick={() => (activeTab = 'projects')}>
			Projects ({proposals.length})
		</button>
	</div>

	{#if activeTab === 'bounties'}
		{#if submissions.length === 0}
			<Card>
				<CardContent class="text-ink-soft py-12 text-center">
					You haven't submitted to any bounties yet.
					<a href="/bounties" class="underline">Browse bounties</a>.
				</CardContent>
			</Card>
		{:else}
			<div class="space-y-3">
				{#each submissions as s (s.id)}
					<Card>
						<CardHeader>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<CardTitle class="text-base">
									<a href={`/bounties/${s.bounty.slug}`} class="hover:underline">
										{s.bounty.title}
									</a>
								</CardTitle>
								<div class="flex flex-wrap items-center gap-2">
									<Badge variant="outline">{s.bounty.type}</Badge>
									{#if s.isWinner && s.bounty.isWinnersAnnounced}
										<Badge variant="success">Winner — pos {s.winnerPosition}</Badge>
									{:else if !s.isWinner && s.bounty.isWinnersAnnounced}
										<Badge variant="destructive">Rejected</Badge>
									{:else if s.status === 'REJECTED'}
										<Badge variant="destructive">Rejected</Badge>
									{:else if s.status === 'APPROVED'}
										<Badge variant="outline">Shortlisted</Badge>
									{:else}
										<Badge variant="secondary">Pending</Badge>
									{/if}
									{#if s.isPaid}
										<Badge variant="success">Paid</Badge>
									{/if}
								</div>
							</div>
						</CardHeader>
						<CardContent class="space-y-2 text-sm">
							<div class="text-ink-soft flex flex-wrap items-center gap-4">
								<span>Submitted {fmtDate(s.createdAt)}</span>
								{#if s.ask != null}
									<span>
										Ask: <strong>{formatMoney(s.ask, s.bounty.currency)}</strong>
									</span>
								{/if}
								{#if s.prizeAmount != null}
									<span>
										Prize: <strong>{formatMoney(s.prizeAmount, s.bounty.currency)}</strong>
									</span>
								{/if}
							</div>
							<div>
								<span class="text-ink-soft">Link:</span>
								<a
									href={s.link}
									target="_blank"
									rel="noopener noreferrer"
									class="break-all underline"
								>
									{s.link}
								</a>
							</div>
							{#if s.feedback}
								<div class="border-bone bg-paper rounded-md border p-3">
									<div class="text-ink-soft mb-1 font-mono text-xs font-medium uppercase">
										Sponsor feedback
									</div>
									<div>{@html s.feedback}</div>
								</div>
							{/if}
							{#if s.bounty.isWinnersAnnounced}
								<div class="flex justify-end pt-1">
									<RaiseDisputeButton
										bountyId={s.bounty.id}
										bountyTitle={s.bounty.title}
										submissionId={s.id}
									/>
								</div>
							{/if}
						</CardContent>
					</Card>
				{/each}
			</div>
		{/if}
	{:else}
		{#if contractedProjects.length > 0}
			<section class="space-y-2">
				<h2 class="text-ink-soft font-mono text-xs font-semibold tracking-wide uppercase">
					Active engagements
				</h2>
				<div class="grid gap-3 sm:grid-cols-2">
					{#each contractedProjects as p (p.id)}
						<Card>
							<CardHeader>
								<div class="flex items-center justify-between">
									<Badge variant={p.status === 'ACTIVE' ? 'success' : 'outline'}>{p.status}</Badge>
									<span class="text-ink-soft font-mono text-xs tabular-nums">
										{formatMoney(p.budgetCap, p.currency)}
									</span>
								</div>
								<CardTitle class="line-clamp-2 text-base">{p.title}</CardTitle>
							</CardHeader>
							<CardContent>
								{#if p.status === 'ACTIVE' || p.status === 'COMPLETED'}
									<Button size="sm" variant="outline" href={`/projects/${p.slug}/workspace`}>
										Open workspace
									</Button>
								{:else}
									<Button size="sm" variant="outline" href={`/projects/${p.slug}`}>View</Button>
								{/if}
							</CardContent>
						</Card>
					{/each}
				</div>
			</section>
		{/if}

		<section class="space-y-2">
			<h2 class="text-ink-soft font-mono text-xs font-semibold tracking-wide uppercase">
				Proposals
			</h2>
			{#if proposals.length === 0}
				<Card>
					<CardContent class="text-ink-soft py-12 text-center">
						No proposals yet. <a href="/projects" class="underline">Browse projects</a>.
					</CardContent>
				</Card>
			{:else}
				<div class="space-y-3">
					{#each proposals as p (p.id)}
						<Card>
							<CardContent class="flex flex-wrap items-center justify-between gap-3 py-4">
								<div>
									<a href={`/projects/${p.project.slug}`} class="font-medium hover:underline">
										{p.project.title}
									</a>
									<p class="text-ink-soft text-xs">
										Budget {formatMoney(p.project.budgetCap, p.project.currency)}
										{#if p.proposedTimeline}· {p.proposedTimeline}{/if}
									</p>
								</div>
								<div class="flex items-center gap-3">
									<Badge variant={proposalStatusVariant(p.status)}>{p.status}</Badge>
									{#if p.status === 'AWARDED'}
										<Button
											size="sm"
											variant="outline"
											href={`/projects/${p.project.slug}/workspace`}
										>
											Workspace
										</Button>
									{/if}
								</div>
							</CardContent>
						</Card>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>
