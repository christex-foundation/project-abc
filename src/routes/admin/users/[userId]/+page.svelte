<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import {
		PageHeader,
		Button,
		StatusBadge,
		Card,
		Select,
		Modal,
		Input,
		Textarea,
		Label
	} from '$lib/components/ui';
	import Power from '@lucide/svelte/icons/power';
	import Download from '@lucide/svelte/icons/download';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import UserAvatar from '$lib/components/shared/UserAvatar.svelte';
	import FreelancerDetail from './_components/FreelancerDetail.svelte';
	import CompanyDetail from './_components/CompanyDetail.svelte';
	import { formatDate } from '$lib/utils';

	let { data } = $props();
	const detail = $derived(data.detail);
	const u = $derived(detail.user);
	const isSelf = $derived(u.id === data.currentUserId);
	const blockers = $derived(data.deletionBlockers ?? []);

	let deleteOpen = $state(false);
	let deleteConfirm = $state('');
	let deleteReason = $state('');
	let deleting = $state(false);
	const canDelete = $derived(
		!isSelf &&
			deleteConfirm === 'DELETE' &&
			deleteReason.trim().length >= 3 &&
			blockers.length === 0 &&
			!deleting
	);

	async function performDelete() {
		if (!canDelete) return;
		deleting = true;
		try {
			const res = await fetch(`/api/admin/users/${u.id}/delete`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ confirm: 'DELETE', reason: deleteReason.trim() })
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error(json?.error?.message ?? 'Could not delete user.');
				return;
			}
			toast.success(`Deleted ${u.email}.`);
			await goto('/admin/users');
		} finally {
			deleting = false;
		}
	}

	async function patchUser(payload: Record<string, unknown>, msg: string) {
		const res = await fetch(`/api/admin/users/${u.id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const json = await res.json().catch(() => ({}));
		if (!res.ok) {
			toast.error(json?.error?.message ?? 'Action failed.');
			return;
		}
		toast.success(msg);
		await invalidateAll();
	}

	function toggleActive() {
		const verb = u.isActive ? 'Deactivate' : 'Reactivate';
		if (!confirm(`${verb} ${u.email}?`)) return;
		patchUser({ isActive: !u.isActive }, `${verb}d.`);
	}

	function changeRole(e: Event) {
		const next = (e.currentTarget as HTMLSelectElement).value;
		if (next === u.role) return;
		if (!confirm(`Change role to ${next}? Effects take place immediately.`)) {
			(e.currentTarget as HTMLSelectElement).value = u.role;
			return;
		}
		patchUser({ role: next }, `Role changed to ${next.toLowerCase()}.`);
	}
</script>

<PageHeader title={u.name ?? u.email} description={u.email}>
	{#snippet meta()}
		<StatusBadge value={u.role} />
		<StatusBadge value={u.isActive ? 'Active' : 'Deactivated'} />
		{#if u.emailVerified}
			<span class="text-xs text-zinc-500">Email verified</span>
		{/if}
		<span class="text-xs text-zinc-500">Joined {formatDate(u.createdAt)}</span>
	{/snippet}
	{#snippet actions()}
		{#if !isSelf}
			<label class="inline-flex items-center gap-2 text-xs">
				<span class="text-zinc-600">Role</span>
				<Select value={u.role} onchange={changeRole} class="!h-9 !w-36">
					<option value="FREELANCER">Freelancer</option>
					<option value="COMPANY">Company</option>
					<option value="ADMIN">Admin</option>
				</Select>
			</label>
			<Button variant={u.isActive ? 'destructive' : 'secondary'} size="sm" onclick={toggleActive}>
				<Power class="h-3.5 w-3.5" />
				{u.isActive ? 'Deactivate' : 'Reactivate'}
			</Button>
		{/if}
	{/snippet}
</PageHeader>

<div class="mb-4 flex items-center gap-3">
	<UserAvatar seed={u.name ?? u.email} size={48} />
	<div class="text-xs text-zinc-500">
		{#if u.phoneNumber}<div>📱 {u.phoneNumber}</div>{/if}
		{#if u.referralCode}<div>
				Referral code: <span class="font-mono text-zinc-700">{u.referralCode}</span>
			</div>{/if}
	</div>
</div>

{#if detail.kind === 'FREELANCER'}
	<FreelancerDetail
		profile={detail.profile}
		submissions={detail.submissions}
		credits={detail.credits}
		referrals={detail.referrals}
		disputes={detail.disputes}
	/>
{:else if detail.kind === 'COMPANY'}
	<CompanyDetail
		profile={detail.profile}
		bounties={detail.bounties}
		payments={detail.payments}
		disputes={detail.disputes}
	/>
{:else}
	<Card class="p-8 text-center">
		<p class="text-sm text-zinc-600">
			This user is an administrator. Manage admin lifecycle from
			<a class="text-indigo-600 hover:underline" href="/admin/admins">Admins</a>.
		</p>
	</Card>
{/if}

{#if !isSelf}
	<Card class="mt-6 border-red-200 p-4">
		<h3 class="text-sm font-semibold text-red-700">GDPR / danger zone</h3>
		<p class="mt-1 text-xs text-zinc-600">
			Use these to fulfil right-to-access (export) and right-to-erasure (delete) requests received
			over support email. Deletion is permanent and writes an entry to <code
				>AccountDeletionLog</code
			>.
		</p>

		{#if blockers.length > 0}
			<div class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
				<p class="text-xs font-semibold text-amber-800">
					Deletion is blocked until these are resolved:
				</p>
				<ul class="mt-1 space-y-1 text-xs text-amber-900">
					{#each blockers as b (b.code)}
						<li>• {b.message}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="mt-3 flex flex-wrap gap-2">
			<Button href={`/api/admin/users/${u.id}/export`} variant="outline" size="sm">
				<Download class="h-3.5 w-3.5" /> Export user data
			</Button>
			<Button
				variant="destructive"
				size="sm"
				disabled={blockers.length > 0}
				onclick={() => (deleteOpen = true)}
			>
				<Trash2 class="h-3.5 w-3.5" /> Delete user
			</Button>
		</div>
	</Card>
{/if}

<Modal
	bind:open={deleteOpen}
	onClose={() => (deleteOpen = false)}
	title={`Delete ${u.email}?`}
	description="This erases the user and their personal data. History attributable to counterparties (bounties, submissions, payments) is retained with the identity removed."
>
	<div class="space-y-3">
		<div>
			<Label for="admin-delete-reason">Reason (logged for compliance audit)</Label>
			<Textarea
				id="admin-delete-reason"
				bind:value={deleteReason}
				rows={3}
				placeholder="e.g. GDPR erasure request received 2026-05-26 from ${u.email}"
			/>
		</div>
		<div>
			<Label for="admin-delete-confirm">Type <span class="font-mono">DELETE</span> to confirm</Label
			>
			<Input id="admin-delete-confirm" type="text" bind:value={deleteConfirm} autocomplete="off" />
		</div>
	</div>
	{#snippet footer()}
		<Button variant="outline" size="sm" onclick={() => (deleteOpen = false)}>Cancel</Button>
		<Button variant="destructive" size="sm" disabled={!canDelete} onclick={performDelete}>
			{deleting ? 'Deleting…' : 'Delete permanently'}
		</Button>
	{/snippet}
</Modal>
