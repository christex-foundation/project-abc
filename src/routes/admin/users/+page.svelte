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

	function fmt(d: Date | string) {
		return new Date(d).toLocaleDateString();
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
