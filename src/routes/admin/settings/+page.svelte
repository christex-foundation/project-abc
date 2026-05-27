<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	// Form default reflects the server-loaded value at mount time only. Subsequent
	// updates flow through `enabled`.
	// svelte-ignore state_referenced_locally
	let enabled = $state(
		(data.settings?.COMPANY_SELF_REGISTER as { enabled?: boolean } | undefined)?.enabled === true
	);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let savedAt = $state<number | null>(null);

	const creditSetting = data.settings?.FREELANCER_CREDIT_SYSTEM as
		| { enabled?: boolean; monthlyAllocation?: number }
		| undefined;

	// svelte-ignore state_referenced_locally
	let creditsEnabled = $state(creditSetting?.enabled === true);
	// svelte-ignore state_referenced_locally
	let monthlyAllocation = $state(creditSetting?.monthlyAllocation ?? 3);
	let savingCredits = $state(false);
	let creditsError = $state<string | null>(null);
	let creditsSavedAt = $state<number | null>(null);

	const referralSetting = data.settings?.FREELANCER_REFERRAL_SYSTEM as
		| {
				enabled?: boolean;
				maxReferrals?: number;
				creditsPerFirstSubmission?: number;
				creditsPerWin?: number;
		  }
		| undefined;

	// svelte-ignore state_referenced_locally
	let referralEnabled = $state(referralSetting?.enabled === true);
	// svelte-ignore state_referenced_locally
	let maxReferrals = $state(referralSetting?.maxReferrals ?? 10);
	// svelte-ignore state_referenced_locally
	let creditsPerFirstSubmission = $state(referralSetting?.creditsPerFirstSubmission ?? 1);
	// svelte-ignore state_referenced_locally
	let creditsPerWin = $state(referralSetting?.creditsPerWin ?? 2);
	let savingReferral = $state(false);
	let referralError = $state<string | null>(null);
	let referralSavedAt = $state<number | null>(null);

	async function save() {
		saving = true;
		error = null;
		const res = await fetch('/api/admin/settings', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ key: 'COMPANY_SELF_REGISTER', value: { enabled } })
		});
		saving = false;
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			error = body?.error?.message ?? 'Failed to save.';
			return;
		}
		savedAt = Date.now();
		await invalidateAll();
	}

	async function saveCredits() {
		savingCredits = true;
		creditsError = null;
		const res = await fetch('/api/admin/settings', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				key: 'FREELANCER_CREDIT_SYSTEM',
				value: { enabled: creditsEnabled, monthlyAllocation }
			})
		});
		savingCredits = false;
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			creditsError = body?.error?.message ?? 'Failed to save.';
			return;
		}
		creditsSavedAt = Date.now();
		await invalidateAll();
	}

	async function saveReferral() {
		savingReferral = true;
		referralError = null;
		const res = await fetch('/api/admin/settings', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				key: 'FREELANCER_REFERRAL_SYSTEM',
				value: {
					enabled: referralEnabled,
					maxReferrals,
					creditsPerFirstSubmission,
					creditsPerWin
				}
			})
		});
		savingReferral = false;
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			referralError = body?.error?.message ?? 'Failed to save.';
			return;
		}
		referralSavedAt = Date.now();
		await invalidateAll();
	}
</script>

<h1 class="text-2xl font-semibold">Platform settings</h1>

<section class="mt-6 rounded border border-zinc-200 bg-white p-5">
	<h2 class="font-semibold">Company self-register</h2>
	<p class="mt-1 text-sm text-zinc-600">
		When OFF, the public <code>/register</code> page hides the COMPANY role. Admins can always invite
		companies via the Invites page.
	</p>
	<label class="mt-3 flex items-center gap-2 text-sm">
		<input type="checkbox" bind:checked={enabled} />
		Enabled
	</label>
	<div class="mt-4 flex items-center gap-3">
		<button
			type="button"
			onclick={save}
			disabled={saving}
			class="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
		>
			{saving ? 'Saving…' : 'Save'}
		</button>
		{#if savedAt}
			<span class="text-xs text-zinc-500">Saved.</span>
		{/if}
		{#if error}
			<span class="text-xs text-red-600">{error}</span>
		{/if}
	</div>
</section>

<section class="mt-6 rounded border border-zinc-200 bg-white p-5">
	<h2 class="font-semibold">Freelancer credit system</h2>
	<p class="mt-1 text-sm text-zinc-600">
		When ON, each freelancer gets a monthly allocation of submission credits. Each non-exempt
		submission costs 1 credit. Winners earn +1, spam submissions cost −1 (floor at 0). Balances
		reset to the monthly allocation at the start of each calendar month; mid-month bonuses do not
		carry over. Lowering the allocation does not clamp existing balances — the new value takes
		effect at the next reset.
	</p>
	<label class="mt-3 flex items-center gap-2 text-sm">
		<input type="checkbox" bind:checked={creditsEnabled} />
		Enabled
	</label>
	<label class="mt-3 flex items-center gap-3 text-sm">
		<span class="w-44">Monthly allocation</span>
		<input
			type="number"
			min="0"
			max="100"
			step="1"
			bind:value={monthlyAllocation}
			class="w-24 rounded border border-zinc-300 px-2 py-1"
		/>
		<span class="text-xs text-zinc-500">credits per freelancer per month</span>
	</label>
	<div class="mt-4 flex items-center gap-3">
		<button
			type="button"
			onclick={saveCredits}
			disabled={savingCredits}
			class="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
		>
			{savingCredits ? 'Saving…' : 'Save'}
		</button>
		{#if creditsSavedAt}
			<span class="text-xs text-zinc-500">Saved.</span>
		{/if}
		{#if creditsError}
			<span class="text-xs text-red-600">{creditsError}</span>
		{/if}
	</div>
</section>

<section class="mt-6 rounded border border-zinc-200 bg-white p-5">
	<h2 class="font-semibold">Freelancer referral system</h2>
	<p class="mt-1 text-sm text-zinc-600">
		When ON, each freelancer gets a shareable code on their dashboard. Referrers earn
		<code>creditsPerFirstSubmission</code>
		when a referred friend (with verified email) makes their first non-spam submission, and
		<code>creditsPerWin</code> each time that friend wins a bounty. Spam-labelled submissions reverse
		the first-submission grant. Requires the freelancer credit system to be ON.
	</p>
	<label class="mt-3 flex items-center gap-2 text-sm">
		<input type="checkbox" bind:checked={referralEnabled} />
		Enabled
	</label>
	<label class="mt-3 flex items-center gap-3 text-sm">
		<span class="w-44">Max referrals per user</span>
		<input
			type="number"
			min="0"
			max="1000"
			step="1"
			bind:value={maxReferrals}
			class="w-24 rounded border border-zinc-300 px-2 py-1"
		/>
	</label>
	<label class="mt-3 flex items-center gap-3 text-sm">
		<span class="w-44">Credits per first submission</span>
		<input
			type="number"
			min="0"
			max="100"
			step="1"
			bind:value={creditsPerFirstSubmission}
			class="w-24 rounded border border-zinc-300 px-2 py-1"
		/>
	</label>
	<label class="mt-3 flex items-center gap-3 text-sm">
		<span class="w-44">Credits per win</span>
		<input
			type="number"
			min="0"
			max="100"
			step="1"
			bind:value={creditsPerWin}
			class="w-24 rounded border border-zinc-300 px-2 py-1"
		/>
	</label>
	<div class="mt-4 flex items-center gap-3">
		<button
			type="button"
			onclick={saveReferral}
			disabled={savingReferral}
			class="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
		>
			{savingReferral ? 'Saving…' : 'Save'}
		</button>
		{#if referralSavedAt}
			<span class="text-xs text-zinc-500">Saved.</span>
		{/if}
		{#if referralError}
			<span class="text-xs text-red-600">{referralError}</span>
		{/if}
	</div>
</section>
