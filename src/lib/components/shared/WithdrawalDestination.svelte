<script lang="ts">
	import { Button, Input } from '$lib/components/ui';

	export type Destination = { phone: string; holderName: string; providerName: string };

	type Props = {
		destination: Destination | null;
		onChange?: (d: Destination) => void;
	};

	let { destination = $bindable(), onChange }: Props = $props();

	let editing = $state(false);
	let phone = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);

	async function save() {
		const trimmed = phone.trim();
		if (!trimmed) return;
		saving = true;
		error = null;
		try {
			const res = await fetch('/api/users/me/withdrawal-destination', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ phone: trimmed })
			});
			const body = await res.json();
			if (!res.ok) {
				error = body?.error?.message ?? `Couldn't verify number (${res.status}).`;
				return;
			}
			const next: Destination = {
				phone: body.destination.phone,
				holderName: body.destination.holderName,
				providerName: body.destination.providerName
			};
			destination = next;
			onChange?.(next);
			editing = false;
			phone = '';
		} catch {
			error = 'Network error — please try again.';
		} finally {
			saving = false;
		}
	}

	function startEdit() {
		phone = destination?.phone ?? '';
		error = null;
		editing = true;
	}
</script>

<div class="border-bone rounded-md border p-3">
	<div class="mb-2 flex items-center justify-between">
		<p class="text-ink-soft font-mono text-xs font-medium tracking-wide uppercase">
			Withdrawal mobile money
		</p>
		{#if destination && !editing}
			<Button variant="ghost" size="sm" onclick={startEdit}>Change number</Button>
		{/if}
	</div>

	{#if destination && !editing}
		<div class="space-y-0.5">
			<p class="font-mono text-sm">+{destination.phone}</p>
			<p class="text-ink-soft text-xs">
				{destination.holderName} · {destination.providerName}
			</p>
		</div>
	{:else}
		<p class="text-ink-soft mb-2 text-xs">
			Withdrawals always go to this verified number. You won't need to re-enter it.
		</p>
		<div class="flex gap-2">
			<Input
				type="tel"
				bind:value={phone}
				placeholder="23276000000"
				maxlength={20}
				class="flex-1"
			/>
			<Button onclick={save} disabled={saving || !phone.trim()}>
				{saving ? 'Verifying…' : 'Verify & save'}
			</Button>
			{#if editing && destination}
				<Button
					variant="ghost"
					onclick={() => {
						editing = false;
						error = null;
					}}
				>
					Cancel
				</Button>
			{/if}
		</div>
		{#if error}
			<p class="mt-1.5 text-xs text-red-600">{error}</p>
		{/if}
	{/if}
</div>
