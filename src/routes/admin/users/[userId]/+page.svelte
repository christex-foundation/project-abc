<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { PageHeader, Button, StatusBadge, Card, Select } from '$lib/components/ui';
	import Power from '@lucide/svelte/icons/power';
	import UserAvatar from '$lib/components/shared/UserAvatar.svelte';
	import FreelancerDetail from './_components/FreelancerDetail.svelte';
	import CompanyDetail from './_components/CompanyDetail.svelte';
	import { formatDate } from '$lib/utils';

	let { data } = $props();
	const detail = $derived(data.detail);
	const u = $derived(detail.user);
	const isSelf = $derived(u.id === data.currentUserId);

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
