<script lang="ts">
	import { Button, Input, Label } from '$lib/components/ui';

	type Props = {
		accountId: string;
		currency?: string;
	};
	let { accountId, currency = 'SLE' }: Props = $props();

	// KYC step
	let phone = $state('');
	let kycLoading = $state(false);
	let kycResult = $state<{ holderName: string; providerName: string } | null>(null);
	let kycError = $state<string | null>(null);

	// Withdrawal step
	let amountMajor = $state('');
	let withdrawLoading = $state(false);
	let withdrawSuccess = $state(false);
	let withdrawError = $state<string | null>(null);

	async function verifyKyc() {
		if (!phone.trim()) return;
		kycLoading = true;
		kycResult = null;
		kycError = null;
		try {
			const res = await fetch(
				`/api/users/me/withdraw/kyc?phone=${encodeURIComponent(phone.trim())}`
			);
			const body = await res.json();
			if (!res.ok) {
				kycError = body?.error?.message ?? `Verification failed (${res.status})`;
				return;
			}
			kycResult = body;
		} catch {
			kycError = 'Network error — please try again.';
		} finally {
			kycLoading = false;
		}
	}

	async function submitWithdraw() {
		if (!kycResult || !amountMajor) return;
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
				body: JSON.stringify({ phoneNumber: phone.trim(), amount: amountMinor })
			});
			const body = await res.json();
			if (!res.ok) {
				withdrawError = body?.error?.message ?? `Withdrawal failed (${res.status})`;
				return;
			}
			withdrawSuccess = true;
			// Reset form
			phone = '';
			amountMajor = '';
			kycResult = null;
		} catch {
			withdrawError = 'Network error — please try again.';
		} finally {
			withdrawLoading = false;
		}
	}
</script>

<div class="space-y-4">
	{#if withdrawSuccess}
		<div class="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
			Withdrawal initiated — funds will arrive in your mobile money account shortly.
		</div>
	{/if}

	<!-- Step 1: Phone + KYC -->
	<div class="space-y-1.5">
		<Label for="withdraw-phone">Destination mobile money number</Label>
		<div class="flex gap-2">
			<Input
				id="withdraw-phone"
				type="tel"
				bind:value={phone}
				placeholder="23276000000"
				maxlength={20}
				class="flex-1"
			/>
			<Button variant="outline" onclick={verifyKyc} disabled={kycLoading || !phone.trim()}>
				{kycLoading ? 'Checking…' : 'Verify'}
			</Button>
		</div>
		{#if kycError}
			<p class="text-xs text-red-600">{kycError}</p>
		{/if}
		{#if kycResult}
			<p class="text-xs text-emerald-700">
				✓ <strong>{kycResult.holderName}</strong> · {kycResult.providerName}
			</p>
		{/if}
	</div>

	<!-- Step 2: Amount (only shown after KYC passes) -->
	{#if kycResult}
		<div class="space-y-1.5">
			<Label for="withdraw-amount">Amount ({currency} major units)</Label>
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

		<Button
			onclick={submitWithdraw}
			disabled={withdrawLoading || !amountMajor}
			class="w-full"
		>
			{withdrawLoading ? 'Processing…' : 'Withdraw'}
		</Button>
	{/if}
</div>
