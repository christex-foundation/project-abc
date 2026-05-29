<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Button,
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter,
		Badge
	} from '$lib/components/ui';
	import { trackSubmit } from '$lib/client/forms';

	let { data, form } = $props();
	let submitting = $state(false);

	// SLE MoMo daily limit (Afrimoney) is 15,000 SLE major units.
	const MOMO_DAILY_LIMIT_MINOR = 15_000 * 100;

	function formatMoney(minor: number, currency: string) {
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	const totalMinor = $derived(data.bounty.totalPrizePool);
	const overMomoLimit = $derived(totalMinor > MOMO_DAILY_LIMIT_MINOR);

	// Payment method selection
	type Method = 'checkout' | 'internal_transfer';
	let selectedMethod = $state<Method>('checkout');

	const hasAccount = $derived(!!data.account?.accountId);
	const accountBalance = $derived(data.account?.balance ?? 0);
	const accountUvan = $derived(data.account?.uvan ?? null);
	const hasSufficientBalance = $derived(hasAccount && accountBalance >= totalMinor);

	// Derive form action based on selected method
	const formAction = $derived(
		selectedMethod === 'internal_transfer' ? '?/fundInternal' : '?/fundCheckout'
	);
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<header class="space-y-1">
		<a href="/dashboard/company/bounties" class="text-sm text-zinc-500 hover:underline">
			&larr; Back to bounties
		</a>
		<h1 class="text-2xl font-semibold">Fund bounty</h1>
		<p class="text-sm text-zinc-500">{data.bounty.title}</p>
	</header>

	{#if data.cancelled}
		<div class="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
			Checkout was cancelled. You can try again whenever you're ready.
		</div>
	{/if}

	{#if form?.message}
		<div class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
			{form.message}
		</div>
	{/if}

	<!-- Prize breakdown -->
	<Card>
		<CardHeader>
			<CardTitle>Prize breakdown</CardTitle>
			<CardDescription>These funds will sit in escrow until you announce winners.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-1.5">
			{#if data.bounty.prizeTiers.length === 0}
				<p class="text-sm text-zinc-500">No prize tiers configured.</p>
			{:else}
				<ul class="divide-y text-sm">
					{#each data.bounty.prizeTiers as tier (tier.id)}
						<li class="flex items-center justify-between py-2">
							<span class="flex items-center gap-2">
								{#if tier.position === 99}
									<Badge variant="outline">Bonus</Badge>
								{:else}
									<Badge variant="secondary">#{tier.position}</Badge>
								{/if}
								<span class="text-zinc-700">{tier.label ?? `Position ${tier.position}`}</span>
							</span>
							<span class="font-medium">{formatMoney(tier.amount, data.bounty.currency)}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</CardContent>
		<CardFooter class="flex items-center justify-between border-t pt-4">
			<span class="text-sm font-medium text-zinc-500">Total to deposit</span>
			<span class="text-lg font-semibold">{formatMoney(totalMinor, data.bounty.currency)}</span>
		</CardFooter>
	</Card>

	{#if overMomoLimit}
		<div class="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
			<strong>Heads up:</strong> this amount exceeds the SLE 15,000 daily Mobile Money limit. Use a bank
			transfer on the secure checkout, or fund from your wallet if you have sufficient balance.
		</div>
	{/if}

	<!-- Payment method selector -->
	<div class="space-y-3">
		<p class="text-sm font-medium text-zinc-700">Choose payment method</p>

		<!-- Option 1: Hosted checkout -->
		<button
			type="button"
			onclick={() => (selectedMethod = 'checkout')}
			class="w-full rounded-lg border-2 p-4 text-left transition-colors
				{selectedMethod === 'checkout'
				? 'border-zinc-900 bg-zinc-50'
				: 'border-zinc-200 hover:border-zinc-300'}"
		>
			<div class="flex items-start gap-3">
				<div
					class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2
					{selectedMethod === 'checkout' ? 'border-zinc-900' : 'border-zinc-400'}"
				>
					{#if selectedMethod === 'checkout'}
						<div class="h-2 w-2 rounded-full bg-zinc-900"></div>
					{/if}
				</div>
				<div>
					<p class="font-medium text-zinc-900">Pay via card or mobile money</p>
					<p class="mt-0.5 text-sm text-zinc-500">
						Card, mobile money, or bank transfer · Redirects to a secure payment page
					</p>
				</div>
			</div>
		</button>

		<!-- Option 2: Wallet balance (only shown if wallet exists) -->
		{#if hasAccount}
			<button
				type="button"
				onclick={() => hasSufficientBalance && (selectedMethod = 'internal_transfer')}
				disabled={!hasSufficientBalance}
				class="w-full rounded-lg border-2 p-4 text-left transition-colors
					{selectedMethod === 'internal_transfer'
					? 'border-zinc-900 bg-zinc-50'
					: hasSufficientBalance
						? 'border-zinc-200 hover:border-zinc-300'
						: 'cursor-not-allowed border-zinc-200 opacity-60'}"
			>
				<div class="flex items-start gap-3">
					<div
						class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2
						{selectedMethod === 'internal_transfer' ? 'border-zinc-900' : 'border-zinc-400'}"
					>
						{#if selectedMethod === 'internal_transfer'}
							<div class="h-2 w-2 rounded-full bg-zinc-900"></div>
						{/if}
					</div>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<p class="font-medium text-zinc-900">Pay from wallet</p>
							<Badge variant="outline" class="text-xs">Instant</Badge>
						</div>
						<p class="mt-0.5 text-sm text-zinc-500">
							{#if accountUvan}Wallet: {accountUvan} ·
							{/if}Balance: {formatMoney(accountBalance, data.bounty.currency)}
						</p>
						{#if !hasSufficientBalance}
							<p class="mt-1 text-xs text-red-600">
								Insufficient balance — need {formatMoney(totalMinor, data.bounty.currency)}, have
								{formatMoney(accountBalance, data.bounty.currency)}
							</p>
						{/if}
					</div>
				</div>
			</button>
		{:else}
			<div class="rounded-lg border-2 border-dashed border-zinc-200 p-4 text-sm text-zinc-400">
				<p class="font-medium">Pay from wallet</p>
				<p class="mt-0.5">
					<a href="/dashboard/company/profile" class="underline hover:text-zinc-600">
						Activate your wallet
					</a>
					on your profile page to use this option.
				</p>
			</div>
		{/if}
	</div>

	<form method="POST" action={formAction} use:enhance={trackSubmit((v) => (submitting = v))}>
		<Button type="submit" class="w-full" size="lg" disabled={submitting}>
			{#if submitting}
				{selectedMethod === 'internal_transfer' ? 'Funding…' : 'Redirecting…'}
			{:else}
				{selectedMethod === 'internal_transfer'
					? 'Fund from account balance'
					: 'Proceed to payment'}
			{/if}
		</Button>
	</form>
</div>
