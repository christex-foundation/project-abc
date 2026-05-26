<script lang="ts">
	import { onMount } from 'svelte';
	import {
		currentPermission,
		getExistingSubscription,
		requestPermission,
		subscribe
	} from '$lib/client/push';

	const STORAGE_KEY = 'fow_push_prompt_dismissed';

	type UiState = 'hidden' | 'prompt' | 'busy' | 'denied';
	let state: UiState = $state('hidden');

	onMount(async () => {
		try {
			const dismissed = localStorage.getItem(STORAGE_KEY) === '1';
			const perm = currentPermission();
			if (perm === 'unsupported') return;
			if (perm === 'granted') {
				// Already granted — make sure the server has the endpoint.
				const existing = await getExistingSubscription();
				if (!existing) await subscribe();
				return;
			}
			if (perm === 'denied') {
				state = dismissed ? 'hidden' : 'denied';
				return;
			}
			if (!dismissed) state = 'prompt';
		} catch (err) {
			console.warn('[PushPrompt] init failed', err);
		}
	});

	async function enable() {
		state = 'busy';
		// IMPORTANT: requestPermission must be called inside the click handler
		// without an awaited network call before it, or Safari treats the prompt
		// as silent and refuses to surface it.
		const perm = await requestPermission();
		if (perm !== 'granted') {
			state = perm === 'denied' ? 'denied' : 'hidden';
			return;
		}
		await subscribe();
		state = 'hidden';
	}

	function dismiss() {
		try {
			localStorage.setItem(STORAGE_KEY, '1');
		} catch {
			// localStorage may be unavailable (private mode / blocked); accept.
		}
		state = 'hidden';
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && state !== 'hidden') dismiss();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if state === 'prompt' || state === 'busy'}
	<div
		role="status"
		aria-live="polite"
		class="fixed inset-x-3 bottom-20 z-40 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg md:inset-x-auto md:right-6 md:bottom-6 md:max-w-sm"
	>
		<div class="flex items-start gap-3">
			<div class="mt-0.5 text-2xl" aria-hidden="true">🔔</div>
			<div class="flex-1">
				<p class="text-sm font-semibold text-zinc-900">Get instant alerts</p>
				<p class="mt-1 text-xs text-zinc-600">
					Be notified when you're shortlisted, winners are announced, or your prize is paid out.
				</p>
				<div class="mt-3 flex gap-2">
					<button
						type="button"
						class="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
						onclick={enable}
						disabled={state === 'busy'}
					>
						{state === 'busy' ? 'Enabling…' : 'Enable notifications'}
					</button>
					<button
						type="button"
						class="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
						onclick={dismiss}
					>
						Not now
					</button>
				</div>
			</div>
		</div>
	</div>
{:else if state === 'denied'}
	<div
		role="status"
		aria-live="polite"
		class="fixed inset-x-3 bottom-20 z-40 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 shadow-md md:inset-x-auto md:right-6 md:bottom-6 md:max-w-sm"
	>
		<p>
			Notifications are blocked in your browser settings. You can still see updates in your
			<a href="/notifications" class="underline">notifications feed</a>.
		</p>
		<div class="mt-2 text-right">
			<button
				type="button"
				class="rounded px-2 py-1 text-zinc-500 hover:bg-zinc-100"
				onclick={dismiss}>Dismiss</button
			>
		</div>
	</div>
{/if}
