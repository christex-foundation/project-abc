<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let { data } = $props();

	let status = $state(untrack(() => data.status));
	let type = $state(untrack(() => data.type));
	let busyId = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	function applyFilters() {
		const params = new URLSearchParams();
		if (status) params.set('status', status);
		if (type) params.set('type', type);
		goto(`${page.url.pathname}?${params}`, { keepFocus: true });
	}

	function fmtMoney(minor: number, currency: string) {
		return `${currency} ${(minor / 100).toFixed(2)}`;
	}

	function fmt(d: Date | string) {
		return new Date(d).toLocaleString();
	}

	async function retry(id: string) {
		busyId = id;
		errorMsg = null;
		try {
			const res = await fetch(`/api/admin/payments/${id}/retry`, { method: 'POST' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = body?.error?.message ?? `Retry failed (${res.status})`;
				return;
			}
			await invalidateAll();
		} finally {
			busyId = null;
		}
	}
</script>

<h1 class="text-2xl font-semibold">Payments</h1>
<p class="mt-1 text-sm text-zinc-500">{data.total} total</p>

<section class="mt-4 flex flex-wrap items-end gap-3 rounded border border-zinc-200 bg-white p-4">
	<label class="flex flex-col gap-1 text-xs">
		Status
		<select bind:value={status} class="rounded border border-zinc-300 px-3 py-1.5 text-sm">
			<option value="">Any</option>
			<option value="PENDING">Pending</option>
			<option value="PROCESSING">Processing</option>
			<option value="COMPLETED">Completed</option>
			<option value="FAILED">Failed</option>
		</select>
	</label>
	<label class="flex flex-col gap-1 text-xs">
		Type
		<select bind:value={type} class="rounded border border-zinc-300 px-3 py-1.5 text-sm">
			<option value="">Any</option>
			<option value="ESCROW_DEPOSIT">Escrow deposit</option>
			<option value="PRIZE_PAYOUT">Prize payout</option>
			<option value="REFUND">Refund</option>
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

{#if data.payments.length === 0}
	<div class="mt-6">
		<EmptyState title="No payments match these filters" />
	</div>
{:else}
	<section class="mt-6 overflow-x-auto rounded border border-zinc-200 bg-white">
		<table class="w-full text-sm">
			<thead class="bg-zinc-50 text-left text-xs text-zinc-600 uppercase">
				<tr>
					<th class="px-4 py-2">Bounty</th>
					<th class="px-4 py-2">Type</th>
					<th class="px-4 py-2">Status</th>
					<th class="px-4 py-2">Amount</th>
					<th class="px-4 py-2">Recipient</th>
					<th class="px-4 py-2">Retries</th>
					<th class="px-4 py-2">Created</th>
					<th class="px-4 py-2"></th>
				</tr>
			</thead>
			<tbody>
				{#each data.payments as p (p.id)}
					<tr class="border-t border-zinc-100">
						<td class="px-4 py-2">
							<a href={`/bounties/${p.bounty.slug}`} class="hover:underline">{p.bounty.title}</a>
						</td>
						<td class="px-4 py-2 text-xs">{p.type}</td>
						<td class="px-4 py-2 text-xs">
							<span
								class={p.status === 'FAILED'
									? 'text-red-600'
									: p.status === 'COMPLETED'
										? 'text-green-700'
										: 'text-zinc-600'}
							>
								{p.status}
							</span>
						</td>
						<td class="px-4 py-2 text-xs">{fmtMoney(p.amount, p.currency)}</td>
						<td class="px-4 py-2 text-xs text-zinc-600">
							{p.submission?.freelancer.displayName ?? p.toEntity ?? '—'}
						</td>
						<td class="px-4 py-2 text-xs">{p.retryCount}</td>
						<td class="px-4 py-2 text-xs text-zinc-500">{fmt(p.createdAt)}</td>
						<td class="px-4 py-2 text-right">
							{#if p.status === 'FAILED' && p.retryCount < 3}
								<button
									type="button"
									onclick={() => retry(p.id)}
									disabled={busyId === p.id}
									class="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
								>
									Retry
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}
