<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Badge,
		Button,
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		Input,
		Label,
		Checkbox
	} from '$lib/components/ui';
	import { trackSubmit } from '$lib/client/forms';

	let { data, form } = $props();
	let submitting = $state(false);

	function formatMoney(minor: number | null | undefined, currency: string) {
		if (minor == null) return '—';
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString();
	}

	function paymentStatusVariant(status: string) {
		if (status === 'COMPLETED') return 'success' as const;
		if (status === 'FAILED') return 'destructive' as const;
		return 'outline' as const;
	}

	function methodLabel(method: string | null | undefined) {
		if (method === 'INTERNAL_TRANSFER') return 'Account transfer';
		if (method === 'CHECKOUT') return 'Checkout';
		if (method === 'MOMO_PAYOUT') return 'Mobile money';
		return null;
	}

	const bounty = $derived(data.bounty);
	const winner = $derived(data.winner);
	const winners = $derived(data.winners ?? []);
	const prizePayments = $derived(data.prizePayments ?? []);

	// PROJECT-type tranche helpers (unchanged).
	type Tranche = {
		monimePayoutId?: string;
		monimeTransferId?: string;
		amount: number;
		tranche: number;
		final?: boolean;
	};
	const tranches = $derived.by<Tranche[]>(() => {
		if (!winner) return [];
		const pd = winner.paymentDetails;
		return Array.isArray(pd) ? (pd as unknown as Tranche[]) : [];
	});
	const paidSoFar = $derived(tranches.reduce((s, t) => s + t.amount, 0));
	const remaining = $derived(Math.max(0, bounty.totalPrizePool - paidSoFar));
	const canPayMore = $derived(
		!!winner && bounty.isWinnersAnnounced && !winner.isPaid && remaining > 0
	);
</script>

<div class="space-y-6">
	<header class="space-y-1">
		<div class="flex items-center gap-2 text-sm text-zinc-500">
			<a href="/dashboard/company/bounties" class="underline">Bounties</a>
			<span>/</span>
			<a href={`/dashboard/company/bounties/${bounty.id}/submissions`} class="underline">
				Submissions
			</a>
			<span>/</span>
			<span>Payments</span>
		</div>
		<h1 class="text-2xl font-semibold">{bounty.title}</h1>
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<Badge variant="outline">{bounty.status}</Badge>
			<Badge variant="outline">PROJECT</Badge>
			<span class="text-zinc-500">
				Prize pool: {formatMoney(bounty.totalPrizePool, bounty.currency)} · Paid:
				{formatMoney(paidSoFar, bounty.currency)} · Remaining:
				{formatMoney(remaining, bounty.currency)}
			</span>
		</div>
	</header>

	{#if form?.message}
		<div
			class="rounded-md border px-3 py-2 text-sm"
			class:border-red-300={!form?.success}
			class:bg-red-50={!form?.success}
			class:text-red-700={!form?.success}
			class:border-emerald-300={form?.success}
			class:bg-emerald-50={form?.success}
			class:text-emerald-700={form?.success}
		>
			{form.message}
		</div>
	{/if}

	{#if bounty.type === 'BOUNTY'}
		<!-- ── BOUNTY: multi-winner payout breakdown ── -->
		{#if !bounty.isWinnersAnnounced}
			<Card>
				<CardContent class="py-12 text-center text-zinc-500">
					Winners haven't been announced yet. Payouts will appear here after announcement.
				</CardContent>
			</Card>
		{:else if winners.length === 0}
			<Card>
				<CardContent class="py-12 text-center text-zinc-500">
					No winners were selected for this bounty.
				</CardContent>
			</Card>
		{:else}
			<Card>
				<CardHeader>
					<CardTitle class="text-base">Winner payouts</CardTitle>
				</CardHeader>
				<CardContent class="py-2">
					<table class="w-full text-sm">
						<thead class="text-left text-xs text-zinc-500 uppercase">
							<tr>
								<th class="py-2 pr-4">Freelancer</th>
								<th class="py-2 pr-4">Position</th>
								<th class="py-2 pr-4">Prize</th>
								<th class="py-2 pr-4">Method</th>
								<th class="py-2 pr-4">Payment status</th>
								<th class="py-2">Paid on</th>
							</tr>
						</thead>
						<tbody>
							{#each winners as w (w.id)}
								{@const payment = prizePayments.find((p) => p.submissionId === w.id)}
								{@const label = methodLabel(payment?.method)}
								<tr class="border-t">
									<td class="py-2 pr-4">
										<div class="font-medium">
											{w.freelancer?.displayName ?? w.freelancerNameSnapshot ?? '(deleted user)'}
										</div>
										{#if w.freelancer}
											<div class="text-xs text-zinc-500">{w.freelancer.user.email}</div>
										{/if}
									</td>
									<td class="py-2 pr-4">
										{w.winnerPosition === 99 ? 'Bonus' : `#${w.winnerPosition}`}
									</td>
									<td class="py-2 pr-4">{formatMoney(w.prizeAmount, bounty.currency)}</td>
									<td class="py-2 pr-4">
										{#if label}
											<Badge variant="outline" class="text-xs">{label}</Badge>
										{:else}
											<span class="text-zinc-400">—</span>
										{/if}
									</td>
									<td class="py-2 pr-4">
										{#if payment}
											<Badge variant={paymentStatusVariant(payment.status)}>
												{payment.status}
											</Badge>
										{:else if w.isPaid}
											<Badge variant="success">COMPLETED</Badge>
										{:else}
											<Badge variant="outline">PENDING</Badge>
										{/if}
									</td>
									<td class="py-2 text-zinc-600">
										{payment ? fmtDate(payment.createdAt) : '—'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</CardContent>
			</Card>
		{/if}
	{:else}
		<!-- ── PROJECT: single-winner tranche payments ── -->
		{#if !winner}
			<Card>
				<CardContent class="py-12 text-center text-zinc-500">
					No winner has been selected yet.
				</CardContent>
			</Card>
		{:else}
			<Card>
				<CardHeader>
					<CardTitle class="text-base">
						{winner.freelancer?.displayName ?? winner.freelancerNameSnapshot ?? '(deleted user)'}
						{#if winner.freelancer}
							<span class="ml-2 text-xs font-normal text-zinc-500">
								{winner.freelancer.user.email}
							</span>
						{/if}
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if tranches.length === 0}
						<p class="text-sm text-zinc-500">No tranches paid yet.</p>
					{:else}
						<table class="w-full text-sm">
							<thead class="text-left text-xs text-zinc-500 uppercase">
								<tr>
									<th class="pr-4 pb-1">#</th>
									<th class="pr-4 pb-1">Amount</th>
									<th class="pr-4 pb-1">Method</th>
									<th class="pr-4 pb-1">Final</th>
									<th class="pb-1">Payment reference</th>
								</tr>
							</thead>
							<tbody>
								{#each tranches as t, i (t.monimeTransferId ?? t.monimePayoutId ?? i)}
									{@const monimeRef = t.monimeTransferId ?? t.monimePayoutId ?? null}
									{@const trancheMethod = t.monimeTransferId
										? 'INTERNAL_TRANSFER'
										: t.monimePayoutId
											? 'MOMO_PAYOUT'
											: null}
									{@const trancheLabel = methodLabel(trancheMethod)}
									<tr class="border-t">
										<td class="py-1 pr-4">{t.tranche}</td>
										<td class="py-1 pr-4">{formatMoney(t.amount, bounty.currency)}</td>
										<td class="py-1 pr-4">
											{#if trancheLabel}
												<Badge variant="outline" class="text-xs">{trancheLabel}</Badge>
											{:else}
												<span class="text-zinc-400">—</span>
											{/if}
										</td>
										<td class="py-1 pr-4">{t.final ? 'Yes' : '—'}</td>
										<td class="py-1 font-mono text-xs text-zinc-500">
											{monimeRef ?? '—'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}

					{#if canPayMore}
						<form
							method="POST"
							action="?/payTranche"
							use:enhance={trackSubmit((v) => (submitting = v))}
							class="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end"
						>
							<input type="hidden" name="submissionId" value={winner.id} />
							<div>
								<Label for="amount">Next tranche amount (minor units)</Label>
								<Input id="amount" name="amount" type="number" min="1" max={remaining} required />
							</div>
							<label class="flex items-center gap-2 text-sm">
								<Checkbox name="final" value="1" />
								Final tranche
							</label>
							<Button type="submit" disabled={submitting}>
								{submitting ? 'Paying…' : 'Pay tranche'}
							</Button>
						</form>
					{:else if winner.isPaid}
						<p class="text-sm text-emerald-700">All tranches paid.</p>
					{:else}
						<p class="text-sm text-zinc-500">
							Cannot initiate next tranche — wait for the previous one to settle.
						</p>
					{/if}
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>
