<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let { data } = $props();

	type Row = (typeof data.disputes)[number];

	let status = $state(untrack(() => data.status));
	let openId = $state<string | null>(null);
	let draftStatus = $state<string>('');
	let draftResolution = $state<string>('');
	let saving = $state(false);
	let errorMsg = $state<string | null>(null);

	function applyFilters() {
		const params = new URLSearchParams();
		if (status) params.set('status', status);
		goto(`${page.url.pathname}?${params}`, { keepFocus: true });
	}

	function openDrawer(d: Row) {
		openId = d.id;
		draftStatus = d.status;
		draftResolution = d.resolution ?? '';
		errorMsg = null;
	}

	function closeDrawer() {
		openId = null;
		draftStatus = '';
		draftResolution = '';
		errorMsg = null;
	}

	async function save(d: Row) {
		saving = true;
		errorMsg = null;
		try {
			const body: Record<string, string> = {};
			if (draftStatus && draftStatus !== d.status) body.status = draftStatus;
			if (draftResolution.trim() && draftResolution.trim() !== (d.resolution ?? '')) {
				body.resolution = draftResolution.trim();
			}
			if (Object.keys(body).length === 0) {
				errorMsg = 'No changes.';
				return;
			}
			const res = await fetch(`/api/admin/disputes/${d.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				errorMsg = j?.error?.message ?? `Save failed (${res.status})`;
				return;
			}
			closeDrawer();
			await invalidateAll();
		} finally {
			saving = false;
		}
	}

	function fmt(d: Date | string) {
		return new Date(d).toLocaleString();
	}

	const openRow = $derived(data.disputes.find((d) => d.id === openId));
</script>

<h1 class="text-2xl font-semibold">Disputes</h1>
<p class="mt-1 text-sm text-zinc-500">{data.disputes.length} shown</p>

<section class="mt-4 flex flex-wrap items-end gap-3 rounded border border-zinc-200 bg-white p-4">
	<label class="flex flex-col gap-1 text-xs">
		Status
		<select bind:value={status} class="rounded border border-zinc-300 px-3 py-1.5 text-sm">
			<option value="">Any</option>
			<option value="OPEN">Open</option>
			<option value="IN_REVIEW">In review</option>
			<option value="RESOLVED">Resolved</option>
		</select>
	</label>
	<button
		type="button"
		onclick={applyFilters}
		class="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white"
	>
		Apply
	</button>
</section>

{#if data.disputes.length === 0}
	<div class="mt-6">
		<EmptyState title="No disputes" description="Nothing has been escalated yet." />
	</div>
{:else}
	<section class="mt-6 overflow-x-auto rounded border border-zinc-200 bg-white">
		<table class="w-full text-sm">
			<thead class="bg-zinc-50 text-left text-xs text-zinc-600 uppercase">
				<tr>
					<th class="px-4 py-2">Bounty</th>
					<th class="px-4 py-2">Raised by</th>
					<th class="px-4 py-2">Reason</th>
					<th class="px-4 py-2">Status</th>
					<th class="px-4 py-2">Created</th>
					<th class="px-4 py-2"></th>
				</tr>
			</thead>
			<tbody>
				{#each data.disputes as d (d.id)}
					<tr class="border-t border-zinc-100">
						<td class="px-4 py-2">
							<a href={`/bounties/${d.bounty.slug}`} class="hover:underline">{d.bounty.title}</a>
						</td>
						<td class="px-4 py-2 text-xs">
							{d.raisedBy.name ?? d.raisedBy.email}
							<span class="ml-1 text-zinc-400">({d.raisedBy.role})</span>
						</td>
						<td class="max-w-xs truncate px-4 py-2 text-xs text-zinc-600">{d.reason}</td>
						<td class="px-4 py-2 text-xs">
							<span
								class={d.status === 'RESOLVED'
									? 'text-green-700'
									: d.status === 'OPEN'
										? 'text-red-600'
										: 'text-amber-600'}
							>
								{d.status}
							</span>
						</td>
						<td class="px-4 py-2 text-xs text-zinc-500">{fmt(d.createdAt)}</td>
						<td class="px-4 py-2 text-right">
							<button
								type="button"
								onclick={() => openDrawer(d)}
								class="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
							>
								Review
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}

{#if openId && openRow}
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="dispute-drawer-title"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
	>
		<button
			type="button"
			aria-label="Close drawer"
			onclick={closeDrawer}
			class="absolute inset-0 cursor-default"
		></button>
		<div class="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
			<h2 id="dispute-drawer-title" class="text-base font-semibold">Review dispute</h2>
			<dl class="mt-3 space-y-2 text-sm">
				<div>
					<dt class="text-xs text-zinc-500">Bounty</dt>
					<dd>{openRow.bounty.title}</dd>
				</div>
				<div>
					<dt class="text-xs text-zinc-500">Raised by</dt>
					<dd>{openRow.raisedBy.name ?? openRow.raisedBy.email} ({openRow.raisedBy.role})</dd>
				</div>
				<div>
					<dt class="text-xs text-zinc-500">Reason</dt>
					<dd class="whitespace-pre-wrap text-zinc-700">{openRow.reason}</dd>
				</div>
			</dl>
			<div class="mt-4 space-y-3">
				<label class="block text-xs">
					Status
					<select
						bind:value={draftStatus}
						class="mt-1 block w-full rounded border border-zinc-300 px-3 py-1.5 text-sm"
					>
						<option value="OPEN">Open</option>
						<option value="IN_REVIEW">In review</option>
						<option value="RESOLVED">Resolved</option>
					</select>
				</label>
				<label class="block text-xs">
					Resolution (sets status to Resolved when filled and notifies the raiser)
					<textarea
						bind:value={draftResolution}
						rows={4}
						maxlength={2000}
						placeholder="Describe the resolution shared with the raiser."
						class="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
					></textarea>
				</label>
				{#if errorMsg}
					<p class="text-sm text-red-600">{errorMsg}</p>
				{/if}
			</div>
			<div class="mt-5 flex justify-end gap-2">
				<button
					type="button"
					onclick={closeDrawer}
					class="rounded border border-zinc-300 px-3 py-1.5 text-sm"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={() => save(openRow)}
					disabled={saving}
					class="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
				>
					{saving ? 'Saving…' : 'Save'}
				</button>
			</div>
		</div>
	</div>
{/if}
