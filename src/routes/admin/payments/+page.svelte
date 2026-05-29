<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import {
		PageHeader,
		Card,
		Button,
		Select,
		StatusBadge,
		Table,
		TableHead,
		TableBody,
		TableRow,
		TableCell
	} from '$lib/components/ui';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import { formatMoney, formatDateTime } from '$lib/utils';

	let { data } = $props();

	let status = $state(untrack(() => data.status));
	let type = $state(untrack(() => data.type));
	let busyId = $state<string | null>(null);

	function applyFilters() {
		const params = new URLSearchParams();
		if (status) params.set('status', status);
		if (type) params.set('type', type);
		goto(`${page.url.pathname}?${params}`, { keepFocus: true });
	}

	async function retry(id: string) {
		busyId = id;
		try {
			const res = await fetch(`/api/admin/payments/${id}/retry`, { method: 'POST' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				toast.error(body?.error?.message ?? 'Retry failed.');
				return;
			}
			toast.success('Retry queued.');
			await invalidateAll();
		} finally {
			busyId = null;
		}
	}
</script>

<PageHeader title="Payments" description={`${data.total} payment events.`} />

<Card class="mb-4 p-4">
	<form
		class="flex flex-wrap items-end gap-3"
		onsubmit={(e) => {
			e.preventDefault();
			applyFilters();
		}}
	>
		<div>
			<label for="filter-status" class="block text-xs font-medium text-zinc-600">Status</label>
			<Select id="filter-status" class="mt-1 !w-44" bind:value={status}>
				<option value="">Any</option>
				<option value="PENDING">Pending</option>
				<option value="PROCESSING">Processing</option>
				<option value="COMPLETED">Completed</option>
				<option value="FAILED">Failed</option>
			</Select>
		</div>
		<div>
			<label for="filter-type" class="block text-xs font-medium text-zinc-600">Type</label>
			<Select id="filter-type" class="mt-1 !w-48" bind:value={type}>
				<option value="">Any</option>
				<option value="ESCROW_DEPOSIT">Escrow deposit</option>
				<option value="PRIZE_PAYOUT">Prize payout</option>
				<option value="REFUND">Refund</option>
			</Select>
		</div>
		<Button type="submit">Apply</Button>
	</form>
</Card>

{#if data.payments.length === 0}
	<EmptyState title="No payments match these filters" />
{:else}
	<Table>
		<TableHead>
			<TableRow hover={false}>
				<TableCell header>Bounty</TableCell>
				<TableCell header>Type</TableCell>
				<TableCell header>Status</TableCell>
				<TableCell header align="right">Amount</TableCell>
				<TableCell header>Recipient</TableCell>
				<TableCell header align="right">Retries</TableCell>
				<TableCell header align="right">Created</TableCell>
				<TableCell header align="right">Actions</TableCell>
			</TableRow>
		</TableHead>
		<TableBody>
			{#each data.payments as p (p.id)}
				<TableRow>
					<TableCell>
						{#if p.bounty}
							<a
								href={`/admin/bounties/${p.bounty.id}`}
								class="font-medium text-zinc-900 hover:text-indigo-600"
							>
								{p.bounty.title}
							</a>
						{:else if p.project}
							<a
								href={`/projects/${p.project.slug}`}
								class="font-medium text-zinc-900 hover:text-indigo-600"
							>
								{p.project.title}
							</a>
						{:else}
							<span class="text-zinc-400">—</span>
						{/if}
					</TableCell>
					<TableCell><StatusBadge value={p.type} /></TableCell>
					<TableCell><StatusBadge value={p.status} /></TableCell>
					<TableCell align="right" class="tabular-nums"
						>{formatMoney(p.amount, p.currency)}</TableCell
					>
					<TableCell class="text-zinc-600">
						{p.submission?.freelancer?.displayName ?? p.toEntity ?? '—'}
					</TableCell>
					<TableCell align="right">{p.retryCount}</TableCell>
					<TableCell align="right" class="text-xs text-zinc-500"
						>{formatDateTime(p.createdAt)}</TableCell
					>
					<TableCell align="right">
						{#if p.status === 'FAILED' && p.retryCount < 3}
							<Button
								variant="outline"
								size="sm"
								disabled={busyId === p.id}
								onclick={() => retry(p.id)}
							>
								<RotateCw class="h-3.5 w-3.5" />
								Retry
							</Button>
						{/if}
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
{/if}
