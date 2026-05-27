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
		Label,
		StatusBadge,
		Table,
		TableHead,
		TableBody,
		TableRow,
		TableCell,
		Drawer
	} from '$lib/components/ui';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import Search from '@lucide/svelte/icons/search';
	import Power from '@lucide/svelte/icons/power';
	import Coins from '@lucide/svelte/icons/coins';
	import { formatDate, formatDateTime } from '$lib/utils';

	let { data } = $props();

	let search = $state(untrack(() => data.search));
	let role = $state(untrack(() => data.role));
	let isActive = $state(untrack(() => data.isActive));
	let busyId = $state<string | null>(null);

	type CreditTxn = {
		id: string;
		delta: number;
		balanceAfter: number;
		reason: string;
		periodKey: string;
		notes: string | null;
		createdAt: string;
		adminUser?: { email: string; name: string | null } | null;
	};

	type CreditPanel = {
		freelancerProfileId: string;
		freelancerName: string;
		loading: boolean;
		balance: number | null;
		monthlyAllocation: number | null;
		periodKey: string | null;
		enabled: boolean;
		transactions: CreditTxn[];
		delta: number;
		notes: string;
		saving: boolean;
	};

	let panel = $state<CreditPanel | null>(null);

	function applyFilters() {
		const params = new URLSearchParams();
		if (search) params.set('q', search);
		if (role) params.set('role', role);
		if (isActive) params.set('active', isActive);
		goto(`${page.url.pathname}?${params}`, { keepFocus: true });
	}

	async function updateUser(id: string, body: Record<string, unknown>, msg: string) {
		busyId = id;
		try {
			const res = await fetch(`/api/admin/users/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const b = await res.json().catch(() => ({}));
				toast.error(b?.error?.message ?? `Update failed (${res.status}).`);
				return;
			}
			toast.success(msg);
			await invalidateAll();
		} finally {
			busyId = null;
		}
	}

	async function openCredits(freelancerProfileId: string, freelancerName: string) {
		panel = {
			freelancerProfileId,
			freelancerName,
			loading: true,
			balance: null,
			monthlyAllocation: null,
			periodKey: null,
			enabled: false,
			transactions: [],
			delta: 1,
			notes: '',
			saving: false
		};
		const res = await fetch(`/api/admin/freelancers/${freelancerProfileId}/credits?limit=10`);
		if (!panel) return;
		if (!res.ok) {
			const b = await res.json().catch(() => ({}));
			toast.error(b?.error?.message ?? `Load failed (${res.status}).`);
			panel.loading = false;
			return;
		}
		const body = await res.json();
		panel.balance = body.balance;
		panel.monthlyAllocation = body.monthlyAllocation;
		panel.periodKey = body.periodKey;
		panel.enabled = body.enabled;
		panel.transactions = body.transactions;
		panel.loading = false;
	}

	async function submitAdjust() {
		if (!panel) return;
		panel.saving = true;
		const res = await fetch(`/api/admin/freelancers/${panel.freelancerProfileId}/credits/adjust`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ delta: panel.delta, notes: panel.notes })
		});
		if (!res.ok) {
			const b = await res.json().catch(() => ({}));
			toast.error(b?.error?.message ?? `Adjust failed (${res.status}).`);
			panel.saving = false;
			return;
		}
		toast.success('Balance adjusted.');
		const reload = await fetch(
			`/api/admin/freelancers/${panel.freelancerProfileId}/credits?limit=10`
		);
		if (reload.ok) {
			const body = await reload.json();
			panel.balance = body.balance;
			panel.transactions = body.transactions;
		}
		panel.delta = 1;
		panel.notes = '';
		panel.saving = false;
	}
</script>

<PageHeader title="Users" description={`${data.total} total registered users.`} />

<Card class="mb-4 p-4">
	<form
		class="flex flex-wrap items-end gap-3"
		onsubmit={(e) => {
			e.preventDefault();
			applyFilters();
		}}
	>
		<div class="min-w-64 flex-1">
			<label class="block text-xs font-medium text-zinc-600">Search</label>
			<div class="relative mt-1">
				<Search class="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
				<Input class="!pl-8" type="search" bind:value={search} placeholder="email or name" />
			</div>
		</div>
		<div>
			<label class="block text-xs font-medium text-zinc-600">Role</label>
			<Select class="mt-1 !w-40" bind:value={role}>
				<option value="">Any</option>
				<option value="FREELANCER">Freelancer</option>
				<option value="COMPANY">Company</option>
				<option value="ADMIN">Admin</option>
			</Select>
		</div>
		<div>
			<label class="block text-xs font-medium text-zinc-600">Status</label>
			<Select class="mt-1 !w-36" bind:value={isActive}>
				<option value="">Any</option>
				<option value="true">Active</option>
				<option value="false">Deactivated</option>
			</Select>
		</div>
		<Button type="submit">Apply</Button>
	</form>
</Card>

{#if data.users.length === 0}
	<EmptyState title="No users match these filters" description="Try clearing search or role." />
{:else}
	<Table>
		<TableHead>
			<TableRow hover={false}>
				<TableCell header>Email</TableCell>
				<TableCell header>Name</TableCell>
				<TableCell header>Role</TableCell>
				<TableCell header>Status</TableCell>
				<TableCell header align="right">Joined</TableCell>
				<TableCell header>Credits</TableCell>
				<TableCell header align="right">Actions</TableCell>
			</TableRow>
		</TableHead>
		<TableBody>
			{#each data.users as u (u.id)}
				<TableRow>
					<TableCell>
						<a
							href={`/admin/users/${u.id}`}
							class="font-medium text-zinc-900 hover:text-indigo-600"
						>
							{u.email}
						</a>
					</TableCell>
					<TableCell class="text-zinc-600">{u.name ?? '—'}</TableCell>
					<TableCell>
						<Select
							class="!h-8 !w-32 !py-1 !text-xs"
							value={u.role}
							disabled={busyId === u.id}
							onchange={(e: Event) =>
								updateUser(
									u.id,
									{ role: (e.currentTarget as HTMLSelectElement).value },
									'Role updated.'
								)}
						>
							<option value="FREELANCER">Freelancer</option>
							<option value="COMPANY">Company</option>
							<option value="ADMIN">Admin</option>
						</Select>
					</TableCell>
					<TableCell><StatusBadge value={u.isActive ? 'Active' : 'Deactivated'} /></TableCell>
					<TableCell align="right" class="text-xs text-zinc-500"
						>{formatDate(u.createdAt)}</TableCell
					>
					<TableCell>
						{#if u.freelancerProfileId}
							<Button
								variant="outline"
								size="sm"
								onclick={() => openCredits(u.freelancerProfileId!, u.name ?? u.email)}
							>
								<Coins class="h-3.5 w-3.5" />
								Manage
							</Button>
						{:else}
							<span class="text-xs text-zinc-400">—</span>
						{/if}
					</TableCell>
					<TableCell align="right">
						<Button
							variant={u.isActive ? 'destructive' : 'secondary'}
							size="sm"
							disabled={busyId === u.id}
							onclick={() =>
								updateUser(
									u.id,
									{ isActive: !u.isActive },
									u.isActive ? 'User deactivated.' : 'User reactivated.'
								)}
						>
							<Power class="h-3.5 w-3.5" />
							{u.isActive ? 'Deactivate' : 'Reactivate'}
						</Button>
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<Drawer
	open={panel !== null}
	onClose={() => (panel = null)}
	title={panel ? `Credits · ${panel.freelancerName}` : ''}
	description={panel?.enabled
		? `Balance ${panel.balance ?? '—'} / ${panel.monthlyAllocation} this month`
		: 'Credit system is currently disabled. Manual adjustments still write audit rows.'}
	width="lg"
>
	{#if panel}
		{#if panel.loading}
			<p class="text-sm text-zinc-500">Loading…</p>
		{:else}
			<Card class="bg-zinc-50 p-4">
				<h3 class="text-sm font-semibold">Adjust balance</h3>
				<div class="mt-3 flex flex-wrap items-end gap-3">
					<div>
						<Label for="delta">Delta (signed)</Label>
						<Input id="delta" type="number" step="1" class="!w-28" bind:value={panel.delta} />
					</div>
					<div class="flex-1">
						<Label for="notes">Reason</Label>
						<Input
							id="notes"
							bind:value={panel.notes}
							placeholder="e.g. MVP bootstrap grant"
							maxlength={500}
						/>
					</div>
					<Button
						disabled={panel.saving || !panel.notes.trim() || panel.delta === 0}
						onclick={submitAdjust}
					>
						{panel.saving ? 'Saving…' : 'Apply'}
					</Button>
				</div>
			</Card>

			<h3 class="mt-6 text-sm font-semibold">Recent activity</h3>
			{#if panel.transactions.length === 0}
				<p class="mt-2 text-sm text-zinc-500">No transactions yet.</p>
			{:else}
				<ul class="mt-2 divide-y divide-zinc-100 rounded border border-zinc-200">
					{#each panel.transactions as t (t.id)}
						<li class="flex items-start justify-between gap-3 px-3 py-2 text-sm">
							<div>
								<span class="font-mono text-xs text-zinc-500">{t.reason}</span>
								<span
									class={t.delta > 0
										? 'ml-2 font-medium text-emerald-700'
										: t.delta < 0
											? 'ml-2 font-medium text-red-600'
											: 'ml-2 text-zinc-500'}
								>
									{t.delta > 0 ? '+' : ''}{t.delta}
								</span>
								<span class="ml-2 text-xs text-zinc-500">→ {t.balanceAfter}</span>
								{#if t.notes}
									<div class="text-xs text-zinc-600">{t.notes}</div>
								{/if}
								{#if t.adminUser}
									<div class="text-xs text-zinc-400">
										by {t.adminUser.name ?? t.adminUser.email}
									</div>
								{/if}
							</div>
							<span class="text-xs text-zinc-500">{formatDateTime(t.createdAt)}</span>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	{/if}
</Drawer>
