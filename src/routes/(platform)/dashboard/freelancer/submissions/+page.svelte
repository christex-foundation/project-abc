<script lang="ts">
	import { Badge, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui';
	import RaiseDisputeButton from '$lib/components/shared/RaiseDisputeButton.svelte';

	let { data } = $props();

	let activeTab = $state<'submissions' | 'earnings'>('submissions');

	function formatMoney(minor: number | null | undefined, currency: string) {
		if (minor == null) return '—';
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString();
	}

	const submissions = $derived(data.submissions);
	const earnings = $derived(data.earnings);

	const totalEarned = $derived(
		earnings.filter((e) => e.status === 'COMPLETED').reduce((s, e) => s + e.amount, 0)
	);
	const pending = $derived(
		earnings
			.filter((e) => e.status === 'PROCESSING' || e.status === 'PENDING')
			.reduce((s, e) => s + e.amount, 0)
	);
	const currency = $derived(earnings[0]?.currency ?? 'SLE');

	const tabBtn = (active: boolean) =>
		`rounded-md px-3 py-1.5 text-sm font-medium ${active ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`;
</script>

<div class="space-y-6">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold">Your work</h1>
		<p class="text-sm text-zinc-500">Submissions and earnings across bounties you've entered.</p>
	</header>

	<div class="flex gap-2">
		<button class={tabBtn(activeTab === 'submissions')} onclick={() => (activeTab = 'submissions')}>
			Submissions ({submissions.length})
		</button>
		<button class={tabBtn(activeTab === 'earnings')} onclick={() => (activeTab = 'earnings')}>
			Earnings ({formatMoney(totalEarned, currency)})
		</button>
	</div>

	{#if activeTab === 'submissions'}
		{#if submissions.length === 0}
			<Card>
				<CardContent class="py-12 text-center text-zinc-500">
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
									{#if s.isWinner}
										<Badge variant="success">
											Winner — pos {s.winnerPosition}
										</Badge>
									{:else if s.bounty.isWinnersAnnounced}
										<Badge variant="secondary">Not selected</Badge>
									{:else}
										<Badge variant="outline">Submitted</Badge>
									{/if}
									{#if s.isPaid}
										<Badge variant="success">Paid</Badge>
									{/if}
								</div>
							</div>
						</CardHeader>
						<CardContent class="space-y-2 text-sm">
							<div class="flex flex-wrap items-center gap-4 text-zinc-600">
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
								<span class="text-zinc-500">Link:</span>
								<a href={s.link} target="_blank" rel="noopener noreferrer" class="underline">
									{s.link}
								</a>
							</div>
							{#if s.feedback}
								<div class="rounded-md border bg-zinc-50 p-3">
									<div class="mb-1 text-xs font-medium text-zinc-500 uppercase">
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
		<div class="grid gap-3 sm:grid-cols-2">
			<Card>
				<CardContent class="py-4">
					<div class="text-xs text-zinc-500 uppercase">Total earned</div>
					<div class="text-2xl font-semibold">{formatMoney(totalEarned, currency)}</div>
				</CardContent>
			</Card>
			<Card>
				<CardContent class="py-4">
					<div class="text-xs text-zinc-500 uppercase">In transit</div>
					<div class="text-2xl font-semibold">{formatMoney(pending, currency)}</div>
				</CardContent>
			</Card>
		</div>

		{#if earnings.length === 0}
			<Card>
				<CardContent class="py-12 text-center text-zinc-500">
					No payouts yet — win a bounty to see your earnings here.
				</CardContent>
			</Card>
		{:else}
			<Card>
				<CardContent class="py-2">
					<table class="w-full text-sm">
						<thead class="text-left text-xs text-zinc-500 uppercase">
							<tr>
								<th class="py-2">Bounty</th>
								<th class="py-2">Amount</th>
								<th class="py-2">Status</th>
								<th class="py-2">Date</th>
							</tr>
						</thead>
						<tbody>
							{#each earnings as e (e.id)}
								<tr class="border-t">
									<td class="py-2">
										{#if e.submission?.bounty}
											<a href={`/bounties/${e.submission.bounty.slug}`} class="hover:underline">
												{e.submission.bounty.title}
											</a>
										{:else}
											—
										{/if}
									</td>
									<td class="py-2">{formatMoney(e.amount, e.currency)}</td>
									<td class="py-2">
										<Badge
											variant={e.status === 'COMPLETED'
												? 'success'
												: e.status === 'FAILED'
													? 'destructive'
													: 'outline'}
										>
											{e.status}
										</Badge>
									</td>
									<td class="py-2">{fmtDate(e.createdAt)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>
