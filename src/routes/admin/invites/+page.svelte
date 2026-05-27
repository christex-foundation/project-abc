<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import {
		PageHeader,
		Card,
		Button,
		Input,
		Label,
		StatusBadge,
		Table,
		TableHead,
		TableBody,
		TableRow,
		TableCell
	} from '$lib/components/ui';
	import MailPlus from '@lucide/svelte/icons/mail-plus';
	import { formatDateTime } from '$lib/utils';

	let { data } = $props();

	let email = $state('');
	let companyName = $state('');
	let submitting = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		try {
			const res = await fetch('/api/admin/invites', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email, companyName: companyName || undefined })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				toast.error(body?.error?.message ?? 'Failed to create invite.');
				return;
			}
			toast.success(`Invite sent to ${email}.`);
			email = '';
			companyName = '';
			await invalidateAll();
		} finally {
			submitting = false;
		}
	}
</script>

<PageHeader
	title="Company invites"
	description="Invite companies by email. Acceptance issues a password-reset link."
/>

<Card class="mb-4 p-5">
	<h2 class="text-sm font-semibold text-zinc-900">Invite a company</h2>
	<form class="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end" onsubmit={submit}>
		<div>
			<Label for="i-email">Email</Label>
			<Input
				id="i-email"
				type="email"
				required
				bind:value={email}
				placeholder="founder@example.com"
			/>
		</div>
		<div>
			<Label for="i-company">Company name (optional)</Label>
			<Input id="i-company" bind:value={companyName} placeholder="Christex Foundation" />
		</div>
		<Button type="submit" disabled={submitting}>
			<MailPlus class="h-4 w-4" />
			{submitting ? 'Sending…' : 'Send invite'}
		</Button>
	</form>
</Card>

<Table>
	<TableHead>
		<TableRow hover={false}>
			<TableCell header>Email</TableCell>
			<TableCell header>Company</TableCell>
			<TableCell header>Status</TableCell>
			<TableCell header align="right">Created</TableCell>
			<TableCell header align="right">Accepted</TableCell>
		</TableRow>
	</TableHead>
	<TableBody>
		{#each data.invites as inv (inv.id)}
			<TableRow>
				<TableCell class="font-medium text-zinc-900">{inv.email}</TableCell>
				<TableCell class="text-zinc-600">{inv.companyName ?? '—'}</TableCell>
				<TableCell><StatusBadge value={inv.status} /></TableCell>
				<TableCell align="right" class="text-xs text-zinc-500"
					>{formatDateTime(inv.createdAt)}</TableCell
				>
				<TableCell align="right" class="text-xs text-zinc-500">
					{inv.acceptedAt ? formatDateTime(inv.acceptedAt) : '—'}
				</TableCell>
			</TableRow>
		{:else}
			<TableRow hover={false}>
				<TableCell colspan={5} align="center" class="py-8 text-zinc-500">No invites yet.</TableCell>
			</TableRow>
		{/each}
	</TableBody>
</Table>
