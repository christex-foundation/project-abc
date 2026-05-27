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
	let momo = $state(untrack(() => data.profile.monimePayoutMomoNumber ?? ''));

	let saving = $state(false);
	let savedAt = $state<Date | null>(null);
	let errorMsg = $state<string | null>(null);

	// Financial account
	let accountId = $state<string | null>(untrack(() => data.profile.monimeFinancialAccountId ?? null));
	let uvan = $state<string | null>(untrack(() => data.profile.monimeUvan ?? null));
	let balance = $state<number | null>(null);
	let accountLoading = $state(false);
	let setupLoading = $state(false);
	let showWithdraw = $state(false);
	let copied = $state(false);

	onMount(async () => {
		if (!accountId) return;
		accountLoading = true;
		try {
			const res = await fetch('/api/users/me/financial-account');
			if (res.ok) {
				const body = await res.json();
				balance = body.balance;
				uvan = body.uvan ?? uvan;
			}
		} finally {
			accountLoading = false;
		}
	});

	async function setupAccount() {
		setupLoading = true;
		try {
			const res = await fetch('/api/users/me/financial-account', { method: 'POST' });
			if (res.ok) {
				const body = await res.json();
				accountId = body.accountId;
				uvan = body.uvan;
				balance = body.balance;
			}
		} finally {
			setupLoading = false;
		}
	}

	function copyUvan() {
		if (uvan) {
			navigator.clipboard.writeText(uvan);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
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
					country: country || 'SL',
					monimePayoutMomoNumber: momo || null
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
		<h1 class="text-2xl font-semibold">Company profile</h1>
		<p class="text-sm text-zinc-500">
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

	<Card>
		<CardHeader>
			<CardTitle>Payout</CardTitle>
			<CardDescription>
				Required before cancelling a funded bounty — refunds land here.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="space-y-1">
				<Label for="momo">Mobile money number</Label>
				<Input id="momo" bind:value={momo} maxlength={40} placeholder="+232 …" autocomplete="tel" />
			</div>
		</CardContent>
	</Card>

	<!-- Payment Account card -->
	<Card>
		<CardHeader>
			<CardTitle>Payment account</CardTitle>
			<CardDescription>
				Your Monime financial account for instant bounty funding and receiving refunds.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if !accountId}
				<p class="text-sm text-zinc-500">
					Set up a Monime payment account to fund bounties instantly from your balance and receive
					refunds directly — no checkout redirect needed.
				</p>
				<Button onclick={setupAccount} disabled={setupLoading} variant="outline">
					{setupLoading ? 'Setting up…' : 'Set up payment account'}
				</Button>
			{:else}
				<div class="space-y-3">
					<div class="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2">
						<div class="space-y-0.5">
							<p class="text-xs font-medium text-zinc-500 uppercase tracking-wide">UVAN</p>
							<p class="font-mono text-sm">{uvan ?? accountId}</p>
						</div>
						<Button variant="ghost" size="sm" onclick={copyUvan}>
							{copied ? '✓ Copied' : 'Copy'}
						</Button>
					</div>
					<div class="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2">
						<div class="space-y-0.5">
							<p class="text-xs font-medium text-zinc-500 uppercase tracking-wide">Balance</p>
							<p class="text-sm font-semibold">
								{accountLoading ? 'Loading…' : formatMoney(balance)}
							</p>
						</div>
						<Button variant="outline" size="sm" onclick={() => (showWithdraw = !showWithdraw)}>
							{showWithdraw ? 'Cancel' : 'Withdraw'}
						</Button>
					</div>
					{#if showWithdraw}
						<div class="rounded-md border p-4">
							<p class="mb-3 text-sm font-medium">Withdraw to mobile money</p>
							<WithdrawalForm {accountId} />
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
