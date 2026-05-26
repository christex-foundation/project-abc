<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let { data } = $props();

	let search = $state(untrack(() => data.search));
	let status = $state(untrack(() => data.status));
	let type = $state(untrack(() => data.type));
	let busyId = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	function applyFilters() {
		const params = new URLSearchParams();
		if (search) params.set('q', search);
		if (status) params.set('status', status);
		if (type) params.set('type', type);
		goto(`${page.url.pathname}?${params}`, { keepFocus: true });
	}

	function fmtMoney(minor: number, currency: string) {
		return `${currency} ${(minor / 100).toFixed(2)}`;
	}

	function fmt(d: Date | string) {
		return new Date(d).toLocaleDateString();
	}

	async function forceCancel(id: string, title: string) {
		if (!confirm(`Force cancel "${title}"? This will refund the company.`)) return;
		busyId = id;
		errorMsg = null;
		try {
			const res = await fetch(`/api/admin/bounties/${id}/cancel`, { method: 'POST' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = body?.error?.message ?? `Cancel failed (${res.status})`;
				return;
			}
			await invalidateAll();
		} finally {
			busyId = null;
		}
	}
</script>

<h1 class="text-2xl font-semibold">Bounties</h1>
<p class="mt-1 text-sm text-zinc-500">{data.bounties.length} shown</p>

<section class="mt-4 flex flex-wrap items-end gap-3 rounded border border-zinc-200 bg-white p-4">
	<label class="flex flex-col gap-1 text-xs">
		Search
		<input
			type="search"
			bind:value={search}
			placeholder="title or slug"
			class="w-64 rounded border border-zinc-300 px-3 py-1.5 text-sm"
		/>
	</label>
	<label class="flex flex-col gap-1 text-xs">
		Status
		<select bind:value={status} class="rounded border border-zinc-300 px-3 py-1.5 text-sm">
			<option value="">Any</option>
			<option value="DRAFT">Draft</option>
			<option value="FUNDED">Funded</option>
			<option value="ACTIVE">Active</option>
			<option value="JUDGING">Judging</option>
			<option value="COMPLETED">Completed</option>
			<option value="CANCELLED">Cancelled</option>
		</select>
	</label>
	<label class="flex flex-col gap-1 text-xs">
		Type
		<select bind:value={type} class="rounded border border-zinc-300 px-3 py-1.5 text-sm">
			<option value="">Any</option>
			<option value="BOUNTY">Bounty</option>
			<option value="PROJECT">Project</option>
		</select>
	</label>
	<button
		type="button"
		onclick={applyFilters}
		class="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white"
	>
		Apply
	</button>
	{#if errorMsg}<span class="text-sm text-red-600">{errorMsg}</span>{/if}
</section>

{#if data.bounties.length === 0}
	<div class="mt-6">
		<EmptyState title="No bounties match these filters" />
	</div>
{:else}
	<section class="mt-6 overflow-x-auto rounded border border-zinc-200 bg-white">
		<table class="w-full text-sm">
			<thead class="bg-zinc-50 text-left text-xs text-zinc-600 uppercase">
				<tr>
					<th class="px-4 py-2">Title</th>
					<th class="px-4 py-2">Company</th>
					<th class="px-4 py-2">Status</th>
					<th class="px-4 py-2">Type</th>
					<th class="px-4 py-2">Prize pool</th>
					<th class="px-4 py-2">Subs</th>
					<th class="px-4 py-2">Deadline</th>
					<th class="px-4 py-2"></th>
				</tr>
			</thead>
			<tbody>
				{#each data.bounties as b (b.id)}
					<tr class="border-t border-zinc-100">
						<td class="px-4 py-2">
							<a href={`/bounties/${b.slug}`} class="font-medium hover:underline">{b.title}</a>
						</td>
						<td class="px-4 py-2 text-xs text-zinc-600">{b.company.companyName}</td>
						<td class="px-4 py-2 text-xs">{b.status}</td>
						<td class="px-4 py-2 text-xs">{b.type}</td>
						<td class="px-4 py-2 text-xs">{fmtMoney(b.totalPrizePool, b.currency)}</td>
						<td class="px-4 py-2 text-xs">{b._count.submissions}</td>
						<td class="px-4 py-2 text-xs text-zinc-500">{fmt(b.submissionDeadline)}</td>
						<td class="px-4 py-2 text-right">
							{#if ['DRAFT', 'FUNDED', 'ACTIVE'].includes(b.status)}
								<button
									type="button"
									onclick={() => forceCancel(b.id, b.title)}
									disabled={busyId === b.id}
									class="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
								>
									Force cancel
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}
