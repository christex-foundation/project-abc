<script lang="ts">
	import { Badge, Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import WithdrawalForm from '$lib/components/shared/WithdrawalForm.svelte';

	let { data } = $props();

	function formatMoney(minor: number | null | undefined, currency: string) {
		if (minor == null) return '—';
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString();
	}

	const earnings = $derived(data.earnings);
	const account = $derived(data.account);

	const totalEarned = $derived(
		earnings.filter((e) => e.status === 'COMPLETED').reduce((s, e) => s + e.amount, 0)
	);
	const inTransit = $derived(
		earnings
			.filter((e) => e.status === 'PROCESSING' || e.status === 'PENDING')
			.reduce((s, e) => s + e.amount, 0)
	);
	const failedRows = $derived(earnings.filter((e) => e.status === 'FAILED'));
	const failedAmount = $derived(failedRows.reduce((s, e) => s + e.amount, 0));
	const currency = $derived(earnings[0]?.currency ?? 'SLE');

	type EarningRow = (typeof earnings)[number];

	const tranches = $derived.by(() => {
		// Group rows by submission.id to number tranches in chronological order.
		// Project bounties may have multiple PRIZE_PAYOUT rows per submission;
		// only label tranche numbers when a group has more than one row.
		const bySubmission = new Map<string, EarningRow[]>();
		for (const e of earnings) {
			const sid = e.submission?.id ?? `_${e.id}`;
			const arr = bySubmission.get(sid);
			if (arr) arr.push(e);
			else bySubmission.set(sid, [e]);
		}
		const trancheNo = new Map<string, { index: number; total: number }>();
		for (const [, rows] of bySubmission) {
			if (rows.length < 2) continue;
			const sorted = [...rows].sort(
				(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			);
			sorted.forEach((r, i) => {
				trancheNo.set(r.id, { index: i + 1, total: sorted.length });
			});
		}
		return trancheNo;
	});

	function statusVariant(s: string) {
		if (s === 'COMPLETED') return 'success' as const;
		if (s === 'FAILED') return 'destructive' as const;
		return 'outline' as const;
	}

	function methodLabel(method: string | null | undefined) {
		if (method === 'INTERNAL_TRANSFER') return 'Account transfer';
		if (method === 'CHECKOUT') return 'Checkout';
		if (method === 'MOMO_PAYOUT') return 'Mobile money';
		return null;
	}

	let showWithdraw = $state(false);
</script>

<div class="space-y-6">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold">Earnings</h1>
		<p class="text-sm text-zinc-500">Payout history across every bounty you've won.</p>
	</header>

	<!-- Payment account balance card -->
	{#if account.accountId}
		<Card>
			<CardContent class="py-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-medium text-zinc-500 uppercase tracking-wide">Payment account balance</p>
						<p class="text-2xl font-semibold">
							{formatMoney(account.balance, currency)}
						</p>
						{#if account.uvan}
							<p class="mt-0.5 font-mono text-xs text-zinc-400">{account.uvan}</p>
						{/if}
					</div>
					<Button variant="outline" onclick={() => (showWithdraw = !showWithdraw)}>
						{showWithdraw ? 'Cancel' : 'Withdraw →'}
					</Button>
				</div>
				{#if showWithdraw}
					<div class="mt-4 rounded-md border p-4">
						<p class="mb-3 text-sm font-medium">Withdraw to mobile money</p>
						<WithdrawalForm accountId={account.accountId} />
					</div>
				{/if}
			</CardContent>
		</Card>
	{:else}
		<div class="rounded-md border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500">
			<a href="/dashboard/freelancer/profile" class="underline hover:text-zinc-700">
				Set up your payment account
			</a>
			on your profile to withdraw earnings to mobile money.
		</div>
	{/if}

	<!-- Earnings stats -->
	<div class="grid gap-3 sm:grid-cols-3">
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
				<div class="text-xs text-zinc-500 uppercase">Failed ({failedRows.length})</div>
				<div class="text-2xl font-semibold">{formatMoney(failedAmount, currency)}</div>
			</CardContent>
		</Card>
	</div>

	{#if earnings.length === 0}
		<EmptyState title="No payouts yet" description="Win a bounty to start earning.">
			{#snippet action()}
				<Button href="/bounties">Browse bounties</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<Card>
			<CardContent class="py-2">
				<table class="w-full text-sm">
					<thead class="text-left text-xs text-zinc-500 uppercase">
						<tr>
							<th class="py-2">Bounty</th>
							<th class="py-2">Type</th>
							<th class="py-2">Amount</th>
							<th class="py-2">Method</th>
							<th class="py-2">Status</th>
							<th class="py-2">Date</th>
						</tr>
					</thead>
					<tbody>
						{#each earnings as e (e.id)}
							{@const t = tranches.get(e.id)}
							{@const label = methodLabel(e.method)}
							<tr class="border-t">
								<td class="py-2">
									{#if e.submission?.bounty}
										<a href={`/bounties/${e.submission.bounty.slug}`} class="hover:underline">
											{e.submission.bounty.title}
										</a>
										{#if t}
											<span class="ml-1 text-xs text-zinc-500">
												Tranche {t.index}/{t.total}
											</span>
										{/if}
									{:else}
										—
									{/if}
								</td>
								<td class="py-2">
									{#if e.submission?.bounty}
										<Badge variant="outline">{e.submission.bounty.type}</Badge>
									{:else}
										—
									{/if}
								</td>
								<td class="py-2">{formatMoney(e.amount, e.currency)}</td>
								<td class="py-2">
									{#if label}
										<Badge variant="outline" class="text-xs">{label}</Badge>
									{:else}
										—
									{/if}
								</td>
								<td class="py-2">
									<Badge variant={statusVariant(e.status)}>{e.status}</Badge>
								</td>
								<td class="py-2">{fmtDate(e.createdAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</CardContent>
		</Card>
	{/if}
</div>
