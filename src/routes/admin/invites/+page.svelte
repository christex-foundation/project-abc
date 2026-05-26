<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let email = $state('');
	let companyName = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let okMsg = $state<string | null>(null);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		okMsg = null;
		submitting = true;
		const res = await fetch('/api/admin/invites', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email, companyName: companyName || undefined })
		});
		submitting = false;
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			error = body?.error?.message ?? 'Failed to create invite.';
			return;
		}
		okMsg = `Invite sent to ${email}.`;
		email = '';
		companyName = '';
		await invalidateAll();
	}

	function fmt(d: Date | string) {
		return new Date(d).toLocaleString();
	}
</script>

<h1 class="text-2xl font-semibold">Company invites</h1>

<section class="mt-6 rounded border border-zinc-200 bg-white p-5">
	<h2 class="font-semibold">Invite a company</h2>
	<form class="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onsubmit={submit}>
		<input
			type="email"
			required
			placeholder="founder@example.com"
			bind:value={email}
			class="rounded border border-zinc-300 px-3 py-2 text-sm"
		/>
		<input
			type="text"
			placeholder="Company name (optional)"
			bind:value={companyName}
			class="rounded border border-zinc-300 px-3 py-2 text-sm"
		/>
		<button
			type="submit"
			disabled={submitting}
			class="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
		>
			{submitting ? 'Sending…' : 'Send invite'}
		</button>
	</form>
	{#if okMsg}<p class="mt-2 text-sm text-green-700">{okMsg}</p>{/if}
	{#if error}<p class="mt-2 text-sm text-red-600">{error}</p>{/if}
</section>

<section class="mt-6 rounded border border-zinc-200 bg-white">
	<table class="w-full text-sm">
		<thead class="bg-zinc-50 text-left text-xs text-zinc-600 uppercase">
			<tr>
				<th class="px-4 py-2">Email</th>
				<th class="px-4 py-2">Company</th>
				<th class="px-4 py-2">Status</th>
				<th class="px-4 py-2">Created</th>
				<th class="px-4 py-2">Accepted</th>
			</tr>
		</thead>
		<tbody>
			{#each data.invites as inv (inv.id)}
				<tr class="border-t border-zinc-100">
					<td class="px-4 py-2">{inv.email}</td>
					<td class="px-4 py-2">{inv.companyName ?? '—'}</td>
					<td class="px-4 py-2">{inv.status}</td>
					<td class="px-4 py-2">{fmt(inv.createdAt)}</td>
					<td class="px-4 py-2">{inv.acceptedAt ? fmt(inv.acceptedAt) : '—'}</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="px-4 py-6 text-center text-zinc-500">No invites yet.</td></tr>
			{/each}
		</tbody>
	</table>
</section>
