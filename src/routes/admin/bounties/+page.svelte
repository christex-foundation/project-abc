<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import {
		PageHeader,
		Card,
		Button,
		Input,
		Select,
		Checkbox,
		StatusBadge,
		Table,
		TableHead,
		TableBody,
		TableRow,
		TableCell,
		Pagination
	} from '$lib/components/ui';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import Search from '@lucide/svelte/icons/search';
	import Ban from '@lucide/svelte/icons/ban';
	import { formatMoney, formatDate } from '$lib/utils';

	let { data } = $props();

	let search = $state(untrack(() => data.search));
	let status = $state(untrack(() => data.status));
	let type = $state(untrack(() => data.type));
	let busyId = $state<string | null>(null);

	function applyFilters() {
		const params = new URLSearchParams();
		if (search) params.set('q', search);
		if (status) params.set('status', status);
		if (type) params.set('type', type);
		goto(`${page.url.pathname}?${params}`, { keepFocus: true });
	}

	async function forceCancel(id: string, title: string) {
		if (!confirm(`Force cancel "${title}"? This will refund the company.`)) return;
		busyId = id;
		try {
			const res = await fetch(`/api/admin/bounties/${id}/cancel`, { method: 'POST' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				toast.error(body?.error?.message ?? 'Cancel failed.');
				return;
			}
			toast.success('Bounty cancelled.');
			await invalidateAll();
		} finally {
			busyId = null;
		}
	}

	async function toggleExempt(id: string, next: boolean) {
		busyId = id;
		try {
			const res = await fetch(`/api/admin/bounties/${id}/credits-exempt`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ creditsExempt: next })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				toast.error(body?.error?.message ?? 'Update failed.');
				return;
			}
			await invalidateAll();
		} finally {
			busyId = null;
		}
	}
</script>

<PageHeader title="Bounties" description={`${data.bounties.length} bounties shown.`} />

<Card class="mb-4 p-4">
	<form
		class="flex flex-wrap items-end gap-3"
		onsubmit={(e) => {
			e.preventDefault();
			applyFilters();
		}}
	>
		<div class="min-w-64 flex-1">
			<label for="filter-search" class="block text-xs font-medium text-zinc-600">Search</label>
			<div class="relative mt-1">
				<Search class="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
				<Input
					id="filter-search"
					class="!pl-8"
					type="search"
					bind:value={search}
					placeholder="title or slug"
				/>
			</div>
		</div>
		<div>
			<label for="filter-status" class="block text-xs font-medium text-zinc-600">Status</label>
			<Select id="filter-status" class="mt-1 !w-44" bind:value={status}>
				<option value="">Any</option>
				<option value="DRAFT">Draft</option>
				<option value="FUNDED">Funded</option>
				<option value="ACTIVE">Active</option>
				<option value="JUDGING">Judging</option>
				<option value="COMPLETED">Completed</option>
				<option value="CANCELLED">Cancelled</option>
			</Select>
		</div>
		<div>
			<label for="filter-type" class="block text-xs font-medium text-zinc-600">Type</label>
			<Select id="filter-type" class="mt-1 !w-36" bind:value={type}>
				<option value="">Any</option>
				<option value="BOUNTY">Bounty</option>
				<option value="PROJECT">Project</option>
			</Select>
		</div>
		<Button type="submit">Apply</Button>
	</form>
</Card>

{#if data.bounties.length === 0}
	<EmptyState title="No bounties match these filters" />
{:else}
	<Table>
		<TableHead>
			<TableRow hover={false}>
				<TableCell header>Title</TableCell>
				<TableCell header>Company</TableCell>
				<TableCell header>Status</TableCell>
				<TableCell header>Type</TableCell>
				<TableCell header align="right">Prize pool</TableCell>
				<TableCell header align="right">Subs</TableCell>
				<TableCell header>Credits</TableCell>
				<TableCell header align="right">Deadline</TableCell>
				<TableCell header align="right">Actions</TableCell>
			</TableRow>
		</TableHead>
		<TableBody>
			{#each data.bounties as b (b.id)}
				<TableRow>
					<TableCell>
						<a
							href={`/admin/bounties/${b.id}`}
							class="font-medium text-zinc-900 hover:text-indigo-600"
						>
							{b.title}
						</a>
					</TableCell>
					<TableCell class="text-zinc-600">{b.company?.companyName ?? '(deleted)'}</TableCell>
					<TableCell><StatusBadge value={b.status} /></TableCell>
					<TableCell><StatusBadge value={b.type} /></TableCell>
					<TableCell align="right" class="tabular-nums">
						{formatMoney(b.totalPrizePool, b.currency)}
					</TableCell>
					<TableCell align="right">{b._count.submissions}</TableCell>
					<TableCell>
						<label class="inline-flex items-center gap-1.5">
							<Checkbox
								checked={b.creditsExempt}
								disabled={busyId === b.id}
								onchange={(e) => toggleExempt(b.id, (e.currentTarget as HTMLInputElement).checked)}
							/>
							<span class="text-xs text-zinc-600">Exempt</span>
						</label>
					</TableCell>
					<TableCell align="right" class="text-xs text-zinc-500">
						{formatDate(b.submissionDeadline)}
					</TableCell>
					<TableCell align="right">
						{#if ['DRAFT', 'FUNDED', 'ACTIVE'].includes(b.status)}
							<Button
								variant="destructive"
								size="sm"
								disabled={busyId === b.id}
								onclick={() => forceCancel(b.id, b.title)}
							>
								<Ban class="h-3.5 w-3.5" />
								Cancel
							</Button>
						{/if}
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
	<Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
{/if}
