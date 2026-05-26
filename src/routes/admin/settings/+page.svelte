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
