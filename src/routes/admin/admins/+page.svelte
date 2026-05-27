<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import {
		PageHeader,
		Card,
		Button,
		Input,
		Label,
		Table,
		TableHead,
		TableBody,
		TableRow,
		TableCell,
		StatusBadge,
		Modal
	} from '$lib/components/ui';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import ShieldOff from '@lucide/svelte/icons/shield-off';
	import Power from '@lucide/svelte/icons/power';
	import { formatDate } from '$lib/utils';

	let { data } = $props();

	let inviteOpen = $state(false);
	let inviteEmail = $state('');
	let inviteName = $state('');
	let inviting = $state(false);

	async function sendInvite(e: Event) {
		e.preventDefault();
		inviting = true;
		try {
			const res = await fetch('/api/admin/admins', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim() || undefined })
			});
			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.error?.message ?? 'Could not send invite.');
				return;
			}
			toast.success(`Admin invite sent to ${inviteEmail}.`);
			inviteEmail = '';
			inviteName = '';
			inviteOpen = false;
			await invalidateAll();
		} finally {
			inviting = false;
		}
	}

	async function patchUser(userId: string, payload: Record<string, unknown>, msg: string) {
		const res = await fetch(`/api/admin/users/${userId}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const json = await res.json().catch(() => ({}));
		if (!res.ok) {
			toast.error(json?.error?.message ?? 'Action failed.');
			return false;
		}
		toast.success(msg);
		await invalidateAll();
		return true;
	}

	function demote(userId: string, email: string, target: 'FREELANCER' | 'COMPANY') {
		if (!confirm(`Demote ${email} to ${target}?`)) return;
		patchUser(userId, { role: target }, `${email} demoted to ${target.toLowerCase()}.`);
	}

	function toggleActive(userId: string, email: string, isActive: boolean) {
		const verb = isActive ? 'Deactivate' : 'Reactivate';
		if (!confirm(`${verb} ${email}?`)) return;
		patchUser(
			userId,
			{ isActive: !isActive },
			`${email} ${isActive ? 'deactivated' : 'reactivated'}.`
		);
	}
</script>

<PageHeader title="Administrators" description="Manage co-admin access to this console.">
	{#snippet actions()}
		<Button onclick={() => (inviteOpen = true)}>
			<UserPlus class="h-4 w-4" />
			Invite admin
		</Button>
	{/snippet}
</PageHeader>

{#if data.admins.length === 0}
	<Card class="p-10 text-center">
		<p class="text-sm text-zinc-600">No admins yet.</p>
		<Button class="mt-4" onclick={() => (inviteOpen = true)}>
			<UserPlus class="h-4 w-4" />
			Invite your first co-admin
		</Button>
	</Card>
{:else}
	<Table>
		<TableHead>
			<TableRow hover={false}>
				<TableCell header>Email</TableCell>
				<TableCell header>Name</TableCell>
				<TableCell header>Status</TableCell>
				<TableCell header>Joined</TableCell>
				<TableCell header align="right">Actions</TableCell>
			</TableRow>
		</TableHead>
		<TableBody>
			{#each data.admins as a (a.id)}
				{@const isSelf = a.id === data.currentUserId}
				<TableRow>
					<TableCell>
						<a class="font-medium text-zinc-900 hover:text-indigo-600" href="/admin/users/{a.id}">
							{a.email}
						</a>
						{#if isSelf}
							<span class="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600"
								>you</span
							>
						{/if}
					</TableCell>
					<TableCell class="text-zinc-600">{a.name ?? '—'}</TableCell>
					<TableCell>
						<StatusBadge value={a.isActive ? 'Active' : 'Deactivated'} />
					</TableCell>
					<TableCell class="text-xs text-zinc-500">{formatDate(a.createdAt)}</TableCell>
					<TableCell align="right">
						<div class="flex items-center justify-end gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={isSelf}
								onclick={() => demote(a.id, a.email, 'FREELANCER')}
							>
								<ShieldOff class="h-3.5 w-3.5" />
								Demote
							</Button>
							<Button
								variant={a.isActive ? 'destructive' : 'secondary'}
								size="sm"
								disabled={isSelf}
								onclick={() => toggleActive(a.id, a.email, a.isActive)}
							>
								<Power class="h-3.5 w-3.5" />
								{a.isActive ? 'Deactivate' : 'Reactivate'}
							</Button>
						</div>
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<Modal
	open={inviteOpen}
	onClose={() => (inviteOpen = false)}
	title="Invite an administrator"
	description="They'll receive an email with a link to set their password, then land in the admin console."
>
	<form onsubmit={sendInvite} class="space-y-3">
		<div>
			<Label for="invite-email">Email</Label>
			<Input
				id="invite-email"
				type="email"
				required
				bind:value={inviteEmail}
				placeholder="name@christex.foundation"
			/>
		</div>
		<div>
			<Label for="invite-name">Name (optional)</Label>
			<Input id="invite-name" bind:value={inviteName} placeholder="Sai Mara" />
		</div>
		<div class="flex justify-end gap-2 pt-2">
			<Button type="button" variant="outline" onclick={() => (inviteOpen = false)}>Cancel</Button>
			<Button type="submit" disabled={inviting || !inviteEmail}>
				{inviting ? 'Sending…' : 'Send invite'}
			</Button>
		</div>
	</form>
</Modal>
