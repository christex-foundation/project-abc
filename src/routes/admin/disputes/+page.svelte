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
		Label,
		Textarea,
		StatusBadge,
		Table,
		TableHead,
		TableBody,
		TableRow,
		TableCell,
		Drawer
	} from '$lib/components/ui';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { formatDateTime } from '$lib/utils';

	let { data } = $props();
	type Row = (typeof data.disputes)[number];

	let status = $state(untrack(() => data.status));
	let openId = $state<string | null>(null);
	let draftStatus = $state<string>('');
	let draftResolution = $state<string>('');
	let saving = $state(false);

	function applyFilters() {
		const params = new URLSearchParams();
		if (status) params.set('status', status);
		goto(`${page.url.pathname}?${params}`, { keepFocus: true });
	}

	function openDrawer(d: Row) {
		openId = d.id;
		draftStatus = d.status;
		draftResolution = d.resolution ?? '';
	}

	function closeDrawer() {
		openId = null;
		draftStatus = '';
		draftResolution = '';
	}

	let mediating = $state(false);
	async function mediate(projectId: string, action: 'refund' | 'release-milestone') {
		const verb =
			action === 'refund'
				? 'refund the remaining escrow to the company and cancel the project'
				: 'release the current milestone payment to the contractor';
		if (!confirm(`This will ${verb}. Continue?`)) return;
		mediating = true;
		try {
			const res = await fetch(`/api/admin/projects/${projectId}/${action}`, { method: 'POST' });
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				toast.error(j?.error?.message ?? `Failed (${res.status})`);
				return;
			}
			toast.success(action === 'refund' ? 'Escrow refunded.' : 'Milestone released.');
			await invalidateAll();
		} finally {
			mediating = false;
		}
	}

	async function save(d: Row) {
		saving = true;
		try {
			const body: Record<string, string> = {};
			if (draftStatus && draftStatus !== d.status) body.status = draftStatus;
			if (draftResolution.trim() && draftResolution.trim() !== (d.resolution ?? '')) {
				body.resolution = draftResolution.trim();
			}
			if (Object.keys(body).length === 0) {
				toast.error('No changes.');
				return;
			}
			const res = await fetch(`/api/admin/disputes/${d.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				toast.error(j?.error?.message ?? 'Save failed.');
				return;
			}
			toast.success('Dispute updated.');
			closeDrawer();
			await invalidateAll();
		} finally {
			saving = false;
		}
	}

	const openRow = $derived(data.disputes.find((d) => d.id === openId));
</script>

<PageHeader title="Disputes" description={`${data.disputes.length} cases shown.`} />

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
			<Select id="filter-status" class="mt-1 !w-40" bind:value={status}>
				<option value="">Any</option>
				<option value="OPEN">Open</option>
				<option value="IN_REVIEW">In review</option>
				<option value="RESOLVED">Resolved</option>
			</Select>
		</div>
		<Button type="submit">Apply</Button>
	</form>
</Card>

{#if data.disputes.length === 0}
	<EmptyState title="No disputes" description="Nothing has been escalated yet." />
{:else}
	<Table>
		<TableHead>
			<TableRow hover={false}>
				<TableCell header>Bounty</TableCell>
				<TableCell header>Raised by</TableCell>
				<TableCell header>Reason</TableCell>
				<TableCell header>Status</TableCell>
				<TableCell header align="right">Created</TableCell>
				<TableCell header align="right">Action</TableCell>
			</TableRow>
		</TableHead>
		<TableBody>
			{#each data.disputes as d (d.id)}
				<TableRow>
					<TableCell>
						{#if d.bounty}
							<a
								href={`/admin/bounties/${d.bounty.id}`}
								class="font-medium text-zinc-900 hover:text-indigo-600"
							>
								{d.bounty.title}
							</a>
						{:else if d.project}
							<a
								href={`/projects/${d.project.slug}`}
								class="font-medium text-zinc-900 hover:text-indigo-600"
							>
								{d.project.title}
								<span class="ml-1 text-[10px] tracking-wide text-zinc-400 uppercase">project</span>
							</a>
						{:else}
							<span class="text-zinc-400">—</span>
						{/if}
					</TableCell>
					<TableCell class="text-xs">
						{#if d.raisedBy}
							<a href={`/admin/users/${d.raisedBy.id}`} class="hover:text-indigo-600">
								{d.raisedBy.name ?? d.raisedBy.email}
							</a>
							<span class="ml-1 text-zinc-400">({d.raisedBy.role.toLowerCase()})</span>
						{:else}
							<span class="text-zinc-500">(deleted user)</span>
						{/if}
					</TableCell>
					<TableCell class="max-w-xs truncate text-xs text-zinc-600">{d.reason}</TableCell>
					<TableCell><StatusBadge value={d.status} /></TableCell>
					<TableCell align="right" class="text-xs text-zinc-500"
						>{formatDateTime(d.createdAt)}</TableCell
					>
					<TableCell align="right">
						<Button variant="outline" size="sm" onclick={() => openDrawer(d)}>Review</Button>
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<Drawer
	open={openId !== null}
	onClose={closeDrawer}
	title="Review dispute"
	description={openRow ? (openRow.bounty?.title ?? openRow.project?.title ?? '') : ''}
	width="md"
>
	{#if openRow}
		<dl class="space-y-3 text-sm">
			<div>
				<dt class="text-xs text-zinc-500">Raised by</dt>
				<dd>
					{#if openRow.raisedBy}
						{openRow.raisedBy.name ?? openRow.raisedBy.email} ({openRow.raisedBy.role.toLowerCase()})
					{:else}
						(deleted user)
					{/if}
				</dd>
			</div>
			<div>
				<dt class="text-xs text-zinc-500">Reason</dt>
				<dd class="whitespace-pre-wrap text-zinc-700">{openRow.reason}</dd>
			</div>
		</dl>
		<div class="mt-5 space-y-3">
			<div>
				<Label for="d-status">Status</Label>
				<Select id="d-status" bind:value={draftStatus}>
					<option value="OPEN">Open</option>
					<option value="IN_REVIEW">In review</option>
					<option value="RESOLVED">Resolved</option>
				</Select>
			</div>
			<div>
				<Label for="d-resolution">Resolution</Label>
				<Textarea
					id="d-resolution"
					bind:value={draftResolution}
					rows={4}
					maxlength={2000}
					placeholder="Describe the resolution shared with the raiser."
				/>
				<p class="mt-1 text-[11px] text-zinc-500">
					When set, this also moves status to Resolved and notifies the raiser.
				</p>
			</div>

			{#if openRow.project}
				<div class="rounded-md border border-zinc-200 p-3">
					<p class="text-xs font-semibold text-zinc-700">Escrow mediation</p>
					<p class="mt-1 text-[11px] text-zinc-500">
						Resolve the money directly. These act on the project's remaining escrow.
					</p>
					<div class="mt-2 flex flex-wrap gap-2">
						<Button
							variant="outline"
							disabled={mediating}
							onclick={() => openRow?.project && mediate(openRow.project.id, 'refund')}
						>
							Refund remaining → company
						</Button>
						<Button
							variant="outline"
							disabled={mediating}
							onclick={() => openRow?.project && mediate(openRow.project.id, 'release-milestone')}
						>
							Release milestone → contractor
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
	{#snippet footer()}
		<Button variant="outline" onclick={closeDrawer}>Cancel</Button>
		<Button disabled={saving || !openRow} onclick={() => openRow && save(openRow)}>
			{saving ? 'Saving…' : 'Save'}
		</Button>
	{/snippet}
</Drawer>
