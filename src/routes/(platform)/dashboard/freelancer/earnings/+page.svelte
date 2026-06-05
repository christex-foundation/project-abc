<script lang="ts">
	import {
		Badge,
		Button,
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import WithdrawalForm from '$lib/components/shared/WithdrawalForm.svelte';
	import WithdrawalDestination from '$lib/components/shared/WithdrawalDestination.svelte';
	import { untrack } from 'svelte';

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
	// Local state so inline destination setup updates the page without a reload.
	let destination = $state(untrack(() => data.destination));

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
		<h1 class="fow-display text-ink text-3xl">Earnings</h1>
		<p class="text-ink-soft text-sm">Payout history across every bounty you've won.</p>
	</header>

	<!-- Wallet balance card -->
	{#if account.accountId}
		<Card>
			<CardContent class="py-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-ink-soft font-mono text-xs font-medium tracking-wide uppercase">
							Wallet balance
						</p>
						<p class="fow-display text-ink text-3xl tabular-nums">
							{formatMoney(account.balance, currency)}
						</p>
						{#if account.uvan}
							<p class="text-ink-soft/70 mt-0.5 font-mono text-xs">{account.uvan}</p>
						{/if}
					</div>
					<Button
						variant="outline"
						onclick={() => (showWithdraw = !showWithdraw)}
						disabled={!destination}
						title={destination ? '' : 'Set up your withdrawal mobile number first'}
					>
						{showWithdraw ? 'Cancel' : 'Withdraw →'}
					</Button>
				</div>
				{#if !destination}
					<div class="mt-4">
						<WithdrawalDestination bind:destination />
					</div>
				{/if}
				{#if showWithdraw && destination}
					<div class="border-bone mt-4 rounded-md border p-4">
						<p class="mb-3 text-sm font-medium">Withdraw to mobile money</p>
						<WithdrawalForm {destination} />
					</div>
				{/if}
			</CardContent>
		</Card>
	{:else}
		<div class="border-bone text-ink-soft rounded-md border border-dashed px-4 py-3 text-sm">
			<a href="/dashboard/freelancer/profile" class="hover:text-ink underline">
				Activate your wallet
			</a>
			on your profile to withdraw earnings to mobile money.
		</div>
	{/if}

	<!-- Earnings stats -->
	<div class={failedRows.length > 0 ? 'grid gap-3 sm:grid-cols-3' : 'grid gap-3 sm:grid-cols-2'}>
		<Card>
			<CardContent class="py-4">
				<div class="text-ink-soft font-mono text-xs uppercase">Total earned</div>
				<div class="fow-display text-ink text-3xl tabular-nums">
					{formatMoney(totalEarned, currency)}
				</div>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="py-4">
				<div class="text-ink-soft font-mono text-xs uppercase">In transit</div>
				<div class="fow-display text-ink text-3xl tabular-nums">
					{formatMoney(inTransit, currency)}
				</div>
			</CardContent>
		</Card>
		{#if failedRows.length > 0}
			<Card>
				<CardContent class="py-4">
					<div class="text-ink-soft font-mono text-xs uppercase">Failed ({failedRows.length})</div>
					<div class="fow-display text-3xl text-red-700 tabular-nums">
						{formatMoney(failedAmount, currency)}
					</div>
				</CardContent>
			</Card>
		{/if}
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
					<thead class="text-ink-soft text-left font-mono text-xs uppercase">
						<tr>
							<th class="py-2">Bounty</th>
							<th class="py-2">Type</th>
							<th class="py-2 text-right">Amount</th>
							<th class="py-2">Method</th>
							<th class="py-2">Status</th>
							<th class="py-2">Date</th>
						</tr>
					</thead>
					<tbody>
						{#each earnings as e (e.id)}
							{@const t = tranches.get(e.id)}
							{@const label = methodLabel(e.method)}
							<tr class="border-bone hover:bg-paper/50 border-t">
								<td class="py-2">
									{#if e.submission?.bounty}
										<a href={`/bounties/${e.submission.bounty.slug}`} class="hover:underline">
											{e.submission.bounty.title}
										</a>
										{#if t}
											<span class="text-ink-soft ml-1 text-xs">
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
								<td class="py-2 text-right tabular-nums">{formatMoney(e.amount, e.currency)}</td>
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
