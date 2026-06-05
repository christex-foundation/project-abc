<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		Badge,
		Button,
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
		Input,
		Label,
		Textarea
	} from '$lib/components/ui';
	import WithdrawalForm from '$lib/components/shared/WithdrawalForm.svelte';

	let { data } = $props();

	let companyName = $state(untrack(() => data.profile.companyName ?? ''));
	let description = $state(untrack(() => data.profile.description ?? ''));
	let website = $state(untrack(() => data.profile.website ?? ''));
	let logo = $state(untrack(() => data.profile.logo ?? ''));
	let industry = $state(untrack(() => data.profile.industry ?? ''));
	let country = $state(untrack(() => data.profile.country ?? 'SL'));

	let saving = $state(false);
	let savedAt = $state<Date | null>(null);
	let errorMsg = $state<string | null>(null);

	// Wallet — the balance lives on Monime; we just fetch and render it.
	let accountId = $state<string | null>(
		untrack(() => data.profile.monimeFinancialAccountId ?? null)
	);
	let balance = $state<number | null>(null);
	let accountLoading = $state(false);
	let activating = $state(false);

	// Verified mobile money refund destination (KYC'd at setup)
	type Destination = { phone: string; holderName: string; providerName: string };
	let destination = $state<Destination | null>(
		untrack(() =>
			data.profile.withdrawalPhone && data.profile.withdrawalVerifiedAt
				? {
						phone: data.profile.withdrawalPhone,
						holderName: data.profile.withdrawalHolderName ?? '',
						providerName: data.profile.withdrawalProviderName ?? ''
					}
				: null
		)
	);
	let editingDestination = $state(false);
	let destPhone = $state('');
	let destSaving = $state(false);
	let destError = $state<string | null>(null);

	let showWithdraw = $state(false);

	onMount(async () => {
		if (!accountId) return;
		accountLoading = true;
		try {
			const res = await fetch('/api/users/me/financial-account');
			if (res.ok) {
				const body = await res.json();
				balance = body.balance;
			}
		} finally {
			accountLoading = false;
		}
	});

	async function activateWallet() {
		activating = true;
		try {
			const res = await fetch('/api/users/me/financial-account', { method: 'POST' });
			if (res.ok) {
				const body = await res.json();
				accountId = body.accountId;
				balance = body.balance;
			}
		} finally {
			activating = false;
		}
	}

	async function saveDestination() {
		const trimmed = destPhone.trim();
		if (!trimmed) return;
		destSaving = true;
		destError = null;
		try {
			const res = await fetch('/api/users/me/withdrawal-destination', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ phone: trimmed })
			});
			const body = await res.json();
			if (!res.ok) {
				destError = body?.error?.message ?? `Couldn't verify number (${res.status}).`;
				return;
			}
			destination = {
				phone: body.destination.phone,
				holderName: body.destination.holderName,
				providerName: body.destination.providerName
			};
			editingDestination = false;
			destPhone = '';
		} catch {
			destError = 'Network error — please try again.';
		} finally {
			destSaving = false;
		}
	}

	function startEditDestination() {
		destPhone = destination?.phone ?? '';
		destError = null;
		editingDestination = true;
	}

	function formatMoney(minor: number | null, currency = 'SLE') {
		if (minor == null) return '—';
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	async function save() {
		saving = true;
		errorMsg = null;
		try {
			const res = await fetch('/api/users/me', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					companyName,
					description: description || null,
					website: website || null,
					logo: logo || null,
					industry: industry || null,
					country: country || 'SL'
				})
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = body?.error?.message ?? `Save failed (${res.status})`;
				return;
			}
			savedAt = new Date();
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6">
	<header class="space-y-1">
		<h1 class="fow-display text-ink text-3xl">Company profile</h1>
		<p class="text-ink-soft text-sm">
			This is how freelancers see your company on bounty listings and detail pages.
		</p>
	</header>

	<Card>
		<CardHeader>
			<CardTitle>About your company</CardTitle>
			<CardDescription>Public information shown to freelancers.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-1">
					<Label for="companyName">Company name</Label>
					<Input id="companyName" bind:value={companyName} maxlength={120} required />
				</div>
				<div class="space-y-1">
					<Label for="industry">Industry</Label>
					<Input id="industry" bind:value={industry} maxlength={120} placeholder="e.g. Fintech" />
				</div>
			</div>
			<div class="space-y-1">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					bind:value={description}
					maxlength={5000}
					rows={5}
					placeholder="What your company does, who it serves, and the kind of work you post here."
				/>
			</div>
			<div class="grid gap-4 sm:grid-cols-3">
				<div class="space-y-1">
					<Label for="website">Website</Label>
					<Input
						id="website"
						type="url"
						bind:value={website}
						maxlength={500}
						placeholder="https://"
					/>
				</div>
				<div class="space-y-1">
					<Label for="logo">Logo URL</Label>
					<Input
						id="logo"
						type="url"
						bind:value={logo}
						maxlength={500}
						placeholder="Cloudinary URL"
					/>
				</div>
				<div class="space-y-1">
					<Label for="country">Country</Label>
					<Input id="country" bind:value={country} maxlength={8} placeholder="SL" />
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Wallet card -->
	<Card>
		<CardHeader>
			<CardTitle>Wallet</CardTitle>
			<CardDescription>
				Fund bounties instantly from your balance and receive refunds without checkout redirects.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if !accountId}
				<p class="text-ink-soft text-sm">
					Activate your wallet to fund bounties instantly and receive refunds.
				</p>
				<Button onclick={activateWallet} disabled={activating} variant="outline">
					{activating ? 'Activating…' : 'Activate wallet'}
				</Button>
			{:else}
				<div class="space-y-3">
					<div class="bg-paper flex items-center justify-between rounded-md px-3 py-2">
						<div class="space-y-0.5">
							<p class="text-ink-soft font-mono text-xs font-medium tracking-wide uppercase">
								Balance
							</p>
							<p class="text-sm font-semibold">
								{accountLoading ? 'Loading…' : formatMoney(balance)}
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onclick={() => (showWithdraw = !showWithdraw)}
							disabled={!destination}
							title={destination ? '' : 'Set up your refund mobile number first'}
						>
							{showWithdraw ? 'Cancel' : 'Withdraw'}
						</Button>
					</div>

					<!-- Refund destination -->
					<div class="border-bone rounded-md border p-3">
						<div class="mb-2 flex items-center justify-between">
							<p class="text-ink-soft font-mono text-xs font-medium tracking-wide uppercase">
								Refund mobile money
							</p>
							{#if destination && !editingDestination}
								<Button variant="ghost" size="sm" onclick={startEditDestination}>
									Change number
								</Button>
							{/if}
						</div>

						{#if destination && !editingDestination}
							<div class="space-y-0.5">
								<p class="font-mono text-sm">+{destination.phone}</p>
								<p class="text-ink-soft text-xs">
									{destination.holderName} · {destination.providerName}
								</p>
							</div>
						{:else}
							<p class="text-ink-soft mb-2 text-xs">
								If we ever refund you, it goes straight to this verified number.
							</p>
							<div class="flex gap-2">
								<Input
									type="tel"
									bind:value={destPhone}
									placeholder="23276000000"
									maxlength={20}
									class="flex-1"
								/>
								<Button onclick={saveDestination} disabled={destSaving || !destPhone.trim()}>
									{destSaving ? 'Verifying…' : 'Verify & save'}
								</Button>
								{#if editingDestination && destination}
									<Button
										variant="ghost"
										onclick={() => {
											editingDestination = false;
											destError = null;
										}}
									>
										Cancel
									</Button>
								{/if}
							</div>
							{#if destError}
								<p class="mt-1.5 text-xs text-red-600">{destError}</p>
							{/if}
						{/if}
					</div>

					{#if showWithdraw && destination}
						<div class="border-bone rounded-md border p-4">
							<p class="mb-3 text-sm font-medium">Withdraw to mobile money</p>
							<WithdrawalForm {destination} />
						</div>
					{/if}
				</div>
			{/if}
		</CardContent>
	</Card>

	<div class="flex items-center gap-3">
		<Button onclick={save} disabled={saving}>
			{saving ? 'Saving…' : 'Save profile'}
		</Button>
		{#if savedAt}
			<Badge variant="success">Saved {savedAt.toLocaleTimeString()}</Badge>
		{/if}
		{#if errorMsg}
			<span class="text-sm text-red-600">{errorMsg}</span>
		{/if}
	</div>
</div>
