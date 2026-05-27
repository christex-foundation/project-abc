<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let { data } = $props();

	let search = $state(untrack(() => data.search));
	let role = $state(untrack(() => data.role));
	let isActive = $state(untrack(() => data.isActive));
	let busyId = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

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
		error: string | null;
	};

	let panel = $state<CreditPanel | null>(null);

	function applyFilters() {
		const params = new URLSearchParams();
		if (search) params.set('q', search);
		if (role) params.set('role', role);
		if (isActive) params.set('active', isActive);
		goto(`${page.url.pathname}?${params}`, { keepFocus: true });
	}

	async function updateUser(id: string, body: Record<string, unknown>) {
		busyId = id;
		errorMsg = null;
		try {
			const res = await fetch(`/api/admin/users/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = body?.error?.message ?? `Update failed (${res.status})`;
				return;
			}
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
			saving: false,
			error: null
		};
		const res = await fetch(`/api/admin/freelancers/${freelancerProfileId}/credits?limit=10`);
		if (!panel) return;
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			panel.error = body?.error?.message ?? `Load failed (${res.status})`;
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

	function closePanel() {
		panel = null;
	}

	async function submitAdjust() {
		if (!panel) return;
		panel.saving = true;
		panel.error = null;
		const res = await fetch(`/api/admin/freelancers/${panel.freelancerProfileId}/credits/adjust`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ delta: panel.delta, notes: panel.notes })
		});
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			panel.error = body?.error?.message ?? `Adjust failed (${res.status})`;
			panel.saving = false;
			return;
		}
		// Re-fetch panel data
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

	function fmt(d: Date | string) {
		return new Date(d).toLocaleDateString();
	}

	function fmtDateTime(d: Date | string) {
		return new Date(d).toLocaleString();
	}
</script>

<h1 class="text-2xl font-semibold">Users</h1>
<p class="mt-1 text-sm text-zinc-500">{data.total} total</p>

<section class="mt-4 flex flex-wrap items-end gap-3 rounded border border-zinc-200 bg-white p-4">
	<label class="flex flex-col gap-1 text-xs">
		Search
		<input
			type="search"
			bind:value={search}
			placeholder="email or name"
			class="w-64 rounded border border-zinc-300 px-3 py-1.5 text-sm"
		/>
	</label>
	<label class="flex flex-col gap-1 text-xs">
		Role
		<select bind:value={role} class="rounded border border-zinc-300 px-3 py-1.5 text-sm">
			<option value="">Any</option>
			<option value="FREELANCER">Freelancer</option>
			<option value="COMPANY">Company</option>
			<option value="ADMIN">Admin</option>
		</select>
	</label>
	<label class="flex flex-col gap-1 text-xs">
		Status
		<select bind:value={isActive} class="rounded border border-zinc-300 px-3 py-1.5 text-sm">
			<option value="">Any</option>
			<option value="true">Active</option>
			<option value="false">Deactivated</option>
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

{#if data.users.length === 0}
	<div class="mt-6">
		<EmptyState title="No users match these filters" description="Try clearing search or role." />
	</div>
{:else}
	<section class="mt-6 overflow-x-auto rounded border border-zinc-200 bg-white">
		<table class="w-full text-sm">
			<thead class="bg-zinc-50 text-left text-xs text-zinc-600 uppercase">
				<tr>
					<th class="px-4 py-2">Email</th>
					<th class="px-4 py-2">Name</th>
					<th class="px-4 py-2">Role</th>
					<th class="px-4 py-2">Status</th>
					<th class="px-4 py-2">Joined</th>
					<th class="px-4 py-2">Credits</th>
					<th class="px-4 py-2"></th>
				</tr>
			</thead>
			<tbody>
				{#each data.users as u (u.id)}
					<tr class="border-t border-zinc-100">
						<td class="px-4 py-2">{u.email}</td>
						<td class="px-4 py-2">{u.name ?? '—'}</td>
						<td class="px-4 py-2">
							<select
								value={u.role}
								onchange={(e) =>
									updateUser(u.id, { role: (e.currentTarget as HTMLSelectElement).value })}
								disabled={busyId === u.id}
								class="rounded border border-zinc-300 px-2 py-1 text-xs"
							>
								<option value="FREELANCER">Freelancer</option>
								<option value="COMPANY">Company</option>
								<option value="ADMIN">Admin</option>
							</select>
						</td>
						<td class="px-4 py-2">
							<span class={u.isActive ? 'text-green-700' : 'text-red-600'}>
								{u.isActive ? 'Active' : 'Deactivated'}
							</span>
						</td>
						<td class="px-4 py-2 text-xs text-zinc-500">{fmt(u.createdAt)}</td>
						<td class="px-4 py-2">
							{#if u.freelancerProfileId}
								<button
									type="button"
									onclick={() => openCredits(u.freelancerProfileId!, u.name ?? u.email)}
									class="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
								>
									Manage
								</button>
							{:else}
								<span class="text-xs text-zinc-400">—</span>
							{/if}
						</td>
						<td class="px-4 py-2 text-right">
							<button
								type="button"
								onclick={() => updateUser(u.id, { isActive: !u.isActive })}
								disabled={busyId === u.id}
								class="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
							>
								{u.isActive ? 'Deactivate' : 'Reactivate'}
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}

{#if panel}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		role="dialog"
		aria-modal="true"
	>
		<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 class="text-lg font-semibold">Credits — {panel.freelancerName}</h2>
					{#if panel.enabled}
						<p class="mt-1 text-sm text-zinc-600">
							Balance: <span class="font-medium">{panel.balance ?? '—'}</span>
							/ {panel.monthlyAllocation} this month
							{#if panel.periodKey}<span class="text-xs text-zinc-400">({panel.periodKey})</span
								>{/if}
						</p>
					{:else}
						<p class="mt-1 text-sm text-amber-600">
							Credit system is currently disabled. Manual adjustments still write audit rows.
						</p>
					{/if}
				</div>
				<button
					type="button"
					onclick={closePanel}
					class="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
				>
					Close
				</button>
			</div>

			{#if panel.loading}
				<p class="mt-6 text-sm text-zinc-500">Loading…</p>
			{:else}
				<div class="mt-6 rounded border border-zinc-200 bg-zinc-50 p-4">
					<h3 class="text-sm font-semibold">Adjust balance</h3>
					<div class="mt-3 flex flex-wrap items-end gap-3">
						<label class="flex flex-col gap-1 text-xs">
							Delta (signed)
							<input
								type="number"
								step="1"
								bind:value={panel.delta}
								class="w-28 rounded border border-zinc-300 px-2 py-1 text-sm"
							/>
						</label>
						<label class="flex flex-1 flex-col gap-1 text-xs">
							Reason
							<input
								type="text"
								bind:value={panel.notes}
								placeholder="e.g. MVP bootstrap grant"
								maxlength="500"
								class="rounded border border-zinc-300 px-2 py-1 text-sm"
							/>
						</label>
						<button
							type="button"
							onclick={submitAdjust}
							disabled={panel.saving || !panel.notes.trim() || panel.delta === 0}
							class="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
						>
							{panel.saving ? 'Saving…' : 'Apply'}
						</button>
					</div>
					{#if panel.error}
						<p class="mt-2 text-xs text-red-600">{panel.error}</p>
					{/if}
				</div>

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
											? 'ml-2 font-medium text-green-700'
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
								<span class="text-xs text-zinc-500">{fmtDateTime(t.createdAt)}</span>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</div>
	</div>
{/if}
