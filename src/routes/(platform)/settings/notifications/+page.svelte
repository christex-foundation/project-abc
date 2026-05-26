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
		<h1 class="text-xl font-semibold text-zinc-900">Notifications</h1>
		<p class="mt-1 text-sm text-zinc-600">
			Choose how FOW keeps you informed about bounties, submissions, and payouts.
		</p>
	</header>

	<form onsubmit={save} class="space-y-6">
		<fieldset class="rounded-lg border border-zinc-200 bg-white p-4">
			<legend class="px-1 text-sm font-semibold text-zinc-700">Email</legend>
			<ul class="divide-y divide-zinc-100">
				{#each data.emailEvents as event (event)}
					<li class="flex items-center justify-between py-2 text-sm">
						<span class="text-zinc-700">{EVENT_LABEL[event] ?? event}</span>
						<input
							type="checkbox"
							bind:checked={email[event]}
							class="h-4 w-4 cursor-pointer accent-zinc-900"
							aria-label={EVENT_LABEL[event] ?? event}
						/>
					</li>
				{/each}
			</ul>
		</fieldset>

		<fieldset class="rounded-lg border border-zinc-200 bg-white p-4">
			<legend class="px-1 text-sm font-semibold text-zinc-700"
				>Push (urgent events only)</legend
			>
			<ul class="divide-y divide-zinc-100">
				{#each data.pushEvents as event (event)}
					<li class="flex items-center justify-between py-2 text-sm">
						<span class="text-zinc-700">{EVENT_LABEL[event] ?? event}</span>
						<input
							type="checkbox"
							bind:checked={push[event]}
							class="h-4 w-4 cursor-pointer accent-zinc-900"
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
				class="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
			>
				{saving ? 'Saving…' : 'Save preferences'}
			</button>
			{#if saved}
				<span class="text-xs text-emerald-600">Saved</span>
			{/if}
		</div>
	</form>

	<section class="rounded-lg border border-zinc-200 bg-white p-4">
		<h2 class="text-sm font-semibold text-zinc-700">This device</h2>
		<p class="mt-1 text-xs text-zinc-600">
			Push goes through your browser's notification permission. Enable it once per device.
		</p>
		<div class="mt-3 flex items-center gap-3">
			{#if hasPush}
				<span class="text-xs text-emerald-600"
					>Subscribed ({data.deviceCount} device{data.deviceCount === 1 ? '' : 's'})</span
				>
				<button
					type="button"
					onclick={disablePushDevice}
					disabled={deviceBusy}
					class="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-60"
				>
					{deviceBusy ? 'Working…' : 'Disable on this device'}
				</button>
			{:else}
				<button
					type="button"
					onclick={enablePushDevice}
					disabled={deviceBusy}
					class="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
				>
					{deviceBusy ? 'Working…' : 'Enable on this device'}
				</button>
			{/if}
		</div>
	</section>
</section>
