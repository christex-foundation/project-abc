<script lang="ts">
	import { Button, Input, Label } from '$lib/components/ui';

	type Destination = {
		phone: string;
		holderName: string;
		providerName: string;
	};

	type Props = {
		destination: Destination;
		currency?: string;
	};
	let { destination, currency = 'SLE' }: Props = $props();

	let amountMajor = $state('');
	let withdrawLoading = $state(false);
	let withdrawSuccess = $state(false);
	let withdrawError = $state<string | null>(null);

	async function submitWithdraw() {
		if (!amountMajor) return;
		const amountMinor = Math.round(parseFloat(amountMajor) * 100);
		if (isNaN(amountMinor) || amountMinor <= 0) {
			withdrawError = 'Enter a valid amount.';
			return;
		}
		withdrawLoading = true;
		withdrawError = null;
		try {
			const res = await fetch('/api/users/me/withdraw', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ amount: amountMinor })
			});
			const body = await res.json();
			if (!res.ok) {
				withdrawError = body?.error?.message ?? `Withdrawal failed (${res.status})`;
				return;
			}
			withdrawSuccess = true;
			amountMajor = '';
		} catch {
			withdrawError = 'Network error — please try again.';
		} finally {
			withdrawLoading = false;
		}
	}
</script>

<div class="space-y-4">
	{#if withdrawSuccess}
		<div class="border-forest-soft bg-forest-soft text-forest rounded-xl border px-3 py-2 text-sm">
			Withdrawal started. Funds will reach your mobile money account shortly.
		</div>
	{/if}

	<div class="bg-paper rounded-xl px-3 py-2 text-xs">
		<p class="text-ink-soft font-mono font-medium tracking-wide uppercase">Sending to</p>
		<p class="text-ink mt-0.5 font-mono text-sm">+{destination.phone}</p>
		<p class="text-ink-soft">
			{destination.holderName} · {destination.providerName}
		</p>
	</div>

	<div class="space-y-1.5">
		<Label for="withdraw-amount">Amount ({currency})</Label>
		<Input
			id="withdraw-amount"
			type="number"
			min="1"
			step="0.01"
			bind:value={amountMajor}
			placeholder="e.g. 100"
		/>
	</div>

	{#if withdrawError}
		<p class="text-sm text-red-600">{withdrawError}</p>
	{/if}

	<Button onclick={submitWithdraw} disabled={withdrawLoading || !amountMajor} class="w-full">
		{withdrawLoading ? 'Processing…' : 'Withdraw'}
	</Button>
</div>
