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

	const MOMO_DAILY_LIMIT_MINOR = 15_000 * 100;

	function formatMoney(minor: number, currency: string) {
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	const totalMinor = $derived(data.amount);
	const overMomoLimit = $derived(totalMinor > MOMO_DAILY_LIMIT_MINOR);

	type Method = 'checkout' | 'internal_transfer';
	let selectedMethod = $state<Method>('checkout');

	const hasAccount = $derived(!!data.account?.accountId);
	const accountBalance = $derived(data.account?.balance ?? 0);
	const accountUvan = $derived(data.account?.uvan ?? null);
	const hasSufficientBalance = $derived(hasAccount && accountBalance >= totalMinor);

	const formAction = $derived(
		selectedMethod === 'internal_transfer' ? '?/fundInternal' : '?/fundCheckout'
	);
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<header class="space-y-1">
		<a href="/dashboard/company/projects" class="text-ink-soft text-sm hover:underline">
			&larr; Back to projects
		</a>
		<h1 class="fow-display text-ink text-3xl">Fund project</h1>
		<p class="text-ink-soft text-sm">{data.project.title} · awarded to {data.contractorName}</p>
	</header>

	{#if data.cancelled}
		<div class="border-ochre bg-ochre-soft text-clay rounded-md border px-3 py-2 text-sm">
			Checkout was cancelled. You can try again whenever you're ready.
		</div>
	{/if}

	{#if form?.message}
		<div class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
			{form.message}
		</div>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle>Milestone schedule</CardTitle>
			<CardDescription>
				The full amount is escrowed now. Each milestone is released to the contractor when you
				approve it.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-1.5">
			<ul class="divide-bone divide-y text-sm">
				{#each data.milestones as m (m.id)}
					<li class="flex items-center justify-between py-2">
						<span class="flex items-center gap-2">
							<Badge variant="secondary">#{m.position}</Badge>
							<span class="text-ink">{m.title}</span>
						</span>
						<span class="font-medium tabular-nums"
							>{formatMoney(m.amount, data.project.currency)}</span
						>
					</li>
				{/each}
			</ul>
		</CardContent>
		<CardFooter class="border-bone flex items-center justify-between border-t pt-4">
			<span class="text-ink-soft text-sm font-medium">Total to escrow</span>
			<span class="text-lg font-semibold tabular-nums"
				>{formatMoney(totalMinor, data.project.currency)}</span
			>
		</CardFooter>
	</Card>

	{#if overMomoLimit}
		<div class="border-ochre bg-ochre-soft text-clay rounded-md border px-3 py-2 text-sm">
			<strong>Heads up:</strong> this amount exceeds the SLE 15,000 daily Mobile Money limit. Use a bank
			transfer on the secure checkout, or fund from your wallet if you have sufficient balance.
		</div>
	{/if}

	<div class="space-y-3">
		<p class="text-ink text-sm font-medium">Choose payment method</p>

		<button
			type="button"
			onclick={() => (selectedMethod = 'checkout')}
			class="w-full rounded-lg border-2 p-4 text-left transition-colors
				{selectedMethod === 'checkout' ? 'border-ink bg-paper' : 'border-bone hover:border-ink'}"
		>
			<div class="flex items-start gap-3">
				<div
					class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2
					{selectedMethod === 'checkout' ? 'border-ink' : 'border-ink-soft'}"
				>
					{#if selectedMethod === 'checkout'}
						<div class="bg-ink h-2 w-2 rounded-full"></div>
					{/if}
				</div>
				<div>
					<p class="text-ink font-medium">Pay via card or mobile money</p>
					<p class="text-ink-soft mt-0.5 text-sm">
						Card, mobile money, or bank transfer · Redirects to a secure payment page
					</p>
				</div>
			</div>
		</button>

		{#if hasAccount}
			<button
				type="button"
				onclick={() => hasSufficientBalance && (selectedMethod = 'internal_transfer')}
				disabled={!hasSufficientBalance}
				class="w-full rounded-lg border-2 p-4 text-left transition-colors
					{selectedMethod === 'internal_transfer'
					? 'border-ink bg-paper'
					: hasSufficientBalance
						? 'border-bone hover:border-ink'
						: 'border-bone cursor-not-allowed opacity-60'}"
			>
				<div class="flex items-start gap-3">
					<div
						class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2
						{selectedMethod === 'internal_transfer' ? 'border-ink' : 'border-ink-soft'}"
					>
						{#if selectedMethod === 'internal_transfer'}
							<div class="bg-ink h-2 w-2 rounded-full"></div>
						{/if}
					</div>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<p class="text-ink font-medium">Pay from wallet</p>
							<Badge variant="outline" class="text-xs">Instant</Badge>
						</div>
						<p class="text-ink-soft mt-0.5 text-sm">
							{#if accountUvan}Wallet: {accountUvan} ·
							{/if}Balance: {formatMoney(accountBalance, data.project.currency)}
						</p>
						{#if !hasSufficientBalance}
							<p class="mt-1 text-xs text-red-600">
								Insufficient balance — need {formatMoney(totalMinor, data.project.currency)}, have
								{formatMoney(accountBalance, data.project.currency)}
							</p>
						{/if}
					</div>
				</div>
			</button>
		{:else}
			<div class="border-bone text-ink-soft rounded-lg border-2 border-dashed p-4 text-sm">
				<p class="font-medium">Pay from wallet</p>
				<p class="mt-0.5">
					<a href="/dashboard/company/profile" class="hover:text-ink underline">
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
