<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { subscribe as subscribePush, unsubscribe as unsubscribePush } from '$lib/client/push';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type BoolMap = Record<string, boolean>;

	function buildInitial(events: readonly string[], existing: BoolMap): BoolMap {
		const out: BoolMap = {};
		for (const e of events) {
			out[e] = existing[e] ?? true;
		}
		return out;
	}

	// Settings form: capture the server-loaded prefs ONCE, then edit locally.
	// `data` is reactive in Svelte 5 but we deliberately don't want this form
	// to reset whenever the load function re-runs — the user is mid-edit.
	/* eslint-disable svelte/no-reactive-reassign */
	// svelte-ignore state_referenced_locally
	const initialEmailPrefs = (data.prefs.email ?? {}) as BoolMap;
	// svelte-ignore state_referenced_locally
	const initialPushPrefs = (data.prefs.push ?? {}) as BoolMap;

	// svelte-ignore state_referenced_locally
	let email: BoolMap = $state(buildInitial(data.emailEvents, initialEmailPrefs));
	// svelte-ignore state_referenced_locally
	let push: BoolMap = $state(buildInitial(data.pushEvents, initialPushPrefs));

	let saving = $state(false);
	let saved = $state(false);
	let deviceBusy = $state(false);
	// svelte-ignore state_referenced_locally
	let hasPush = $state(data.hasPush);

	const EVENT_LABEL: Record<string, string> = {
		BOUNTY_FUNDED: 'Bounty funded',
		BOUNTY_CANCELLED: 'Bounty cancelled',
		BOUNTY_PUBLISHED: 'New bounty matches you',
		SUBMISSION_RECEIVED: 'New submission received (sponsor)',
		SUBMISSION_SHORTLISTED: 'Your submission was shortlisted',
		WINNERS_ANNOUNCED: 'Winners announced',
		PAYOUT_COMPLETED: 'Payout completed',
		PAYOUT_FAILED: 'Payout failed'
	};

	async function save(e: SubmitEvent) {
		e.preventDefault();
		saving = true;
		saved = false;
		try {
			const res = await fetch('/api/users/me/notification-prefs', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email, push })
			});
			if (res.ok) saved = true;
		} finally {
			saving = false;
		}
	}

	async function enablePushDevice() {
		deviceBusy = true;
		try {
			const sub = await subscribePush();
			if (sub) hasPush = true;
			await invalidateAll();
		} finally {
			deviceBusy = false;
		}
	}

	async function disablePushDevice() {
		deviceBusy = true;
		try {
			await unsubscribePush();
			hasPush = false;
			await invalidateAll();
		} finally {
			deviceBusy = false;
		}
	}
</script>

<section class="space-y-6 p-4 md:p-6">
	<header>
		<h1 class="fow-display text-ink text-3xl">Notifications</h1>
		<p class="text-ink-soft mt-1 text-sm">
			Choose how Learn2Earn keeps you posted on bounties, submissions, and payouts.
		</p>
	</header>

	<form onsubmit={save} class="space-y-6">
		<fieldset
			class="border-bone rounded-[var(--radius-card)] border bg-white p-5 shadow-[var(--shadow-card)]"
		>
			<legend class="text-ink px-1 font-mono text-[11px] tracking-wide uppercase">Email</legend>
			<ul class="divide-bone divide-y">
				{#each data.emailEvents as event (event)}
					<li class="flex items-center justify-between py-2.5 text-sm">
						<label class="text-ink flex-1 cursor-pointer" for={`email-${event}`}>
							{EVENT_LABEL[event] ?? event}
						</label>
						<input
							id={`email-${event}`}
							type="checkbox"
							bind:checked={email[event]}
							class="accent-forest h-4 w-4 cursor-pointer"
							aria-label={EVENT_LABEL[event] ?? event}
						/>
					</li>
				{/each}
			</ul>
		</fieldset>

		<fieldset
			class="border-bone rounded-[var(--radius-card)] border bg-white p-5 shadow-[var(--shadow-card)]"
		>
			<legend class="text-ink px-1 font-mono text-[11px] tracking-wide uppercase"
				>Push · urgent events only</legend
			>
			<ul class="divide-bone divide-y">
				{#each data.pushEvents as event (event)}
					<li class="flex items-center justify-between py-2.5 text-sm">
						<label class="text-ink flex-1 cursor-pointer" for={`push-${event}`}>
							{EVENT_LABEL[event] ?? event}
						</label>
						<input
							id={`push-${event}`}
							type="checkbox"
							bind:checked={push[event]}
							class="accent-forest h-4 w-4 cursor-pointer"
							aria-label={EVENT_LABEL[event] ?? event}
						/>
					</li>
				{/each}
			</ul>
		</fieldset>

		<div class="flex items-center gap-3">
			<button
				type="submit"
				disabled={saving}
				class="bg-ink text-cream hover:bg-terracotta rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
			>
				{saving ? 'Saving…' : 'Save preferences'}
			</button>
			{#if saved}
				<span class="text-forest text-xs font-medium">Saved</span>
			{/if}
		</div>
	</form>

	<section
		class="border-bone rounded-[var(--radius-card)] border bg-white p-5 shadow-[var(--shadow-card)]"
	>
		<h2 class="text-ink font-semibold tracking-tight">This device</h2>
		<p class="text-ink-soft mt-1 text-xs">
			Push goes through your browser's notification permission. Turn it on once per device, when you
			want it.
		</p>
		<div class="mt-3 flex items-center gap-3">
			{#if hasPush}
				<span class="text-forest text-xs font-medium"
					>Subscribed ({data.deviceCount} device{data.deviceCount === 1 ? '' : 's'})</span
				>
				<button
					type="button"
					onclick={disablePushDevice}
					disabled={deviceBusy}
					class="border-bone bg-cream text-ink hover:border-ink rounded-full border px-4 py-2 text-xs font-medium transition-colors disabled:opacity-60"
				>
					{deviceBusy ? 'Working…' : 'Disable on this device'}
				</button>
			{:else}
				<button
					type="button"
					onclick={enablePushDevice}
					disabled={deviceBusy}
					class="bg-ink text-cream hover:bg-terracotta rounded-full px-4 py-2 text-xs font-medium transition-colors disabled:opacity-60"
				>
					{deviceBusy ? 'Working…' : 'Enable on this device'}
				</button>
			{/if}
		</div>
	</section>
</section>
