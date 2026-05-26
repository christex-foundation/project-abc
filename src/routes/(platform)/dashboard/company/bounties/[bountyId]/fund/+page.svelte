<script lang="ts">
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

	let { data, form } = $props();

	// SLE MoMo daily limit (Afrimoney) is 15,000 SLE major units.
	const MOMO_DAILY_LIMIT_MINOR = 15_000 * 100;

	function formatMoney(minor: number, currency: string) {
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	const totalMinor = $derived(data.bounty.totalPrizePool);
	const overMomoLimit = $derived(totalMinor > MOMO_DAILY_LIMIT_MINOR);
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
			transfer on the Monime checkout if MoMo is rejected.
		</div>
	{/if}

	<form method="POST">
		<Button type="submit" class="w-full" size="lg">Proceed to payment</Button>
	</form>
</div>
