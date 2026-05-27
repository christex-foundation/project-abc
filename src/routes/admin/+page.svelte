<script lang="ts">
	import {
		StatCard,
		PageHeader,
		Card,
		CardHeader,
		CardTitle,
		StatusBadge,
		Table,
		TableHead,
		TableBody,
		TableRow,
		TableCell
	} from '$lib/components/ui';
	import Users from '@lucide/svelte/icons/users';
	import Building2 from '@lucide/svelte/icons/building-2';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import MailPlus from '@lucide/svelte/icons/mail-plus';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import { formatMoney, formatDate } from '$lib/utils';

	let { data } = $props();
	const s = $derived(data.stats);
</script>

<PageHeader title="Operations overview" description="Platform health at a glance." />

<section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
	<StatCard
		label="Freelancers"
		value={s.users.freelancers}
		hint="Registered creator accounts"
		icon={Users}
		tone="accent"
		href="/admin/users?role=FREELANCER"
	/>
	<StatCard
		label="Companies"
		value={s.users.companies}
		hint="Active sponsor orgs"
		icon={Building2}
		tone="accent"
		href="/admin/users?role=COMPANY"
	/>
	<StatCard
		label="Admins"
		value={s.users.admins}
		hint="Co-administrators"
		icon={ShieldCheck}
		tone="accent"
		href="/admin/admins"
	/>
	<StatCard
		label="Active bounties"
		value={s.bounties.active + s.bounties.judging}
		hint={`${s.bounties.active} live · ${s.bounties.judging} judging`}
		icon={Briefcase}
		tone="success"
		href="/admin/bounties?status=ACTIVE"
	/>
</section>

<section class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
	<StatCard
		label="Payouts (30d)"
		value={formatMoney(s.payments.payoutVolume)}
		hint={`Escrow inflows: ${formatMoney(s.payments.escrowVolume)}`}
		icon={CreditCard}
		tone="neutral"
		href="/admin/payments"
	/>
	<StatCard
		label="Failed payments"
		value={s.payments.failedPayments}
		hint="Awaiting retry"
		icon={XCircle}
		tone={s.payments.failedPayments > 0 ? 'danger' : 'neutral'}
		href="/admin/payments?status=FAILED"
	/>
	<StatCard
		label="Open disputes"
		value={s.ops.openDisputes}
		hint="Need review"
		icon={AlertTriangle}
		tone={s.ops.openDisputes > 0 ? 'warning' : 'neutral'}
		href="/admin/disputes?status=OPEN"
	/>
	<StatCard
		label="Pending invites"
		value={s.ops.pendingInvites}
		hint="Awaiting acceptance"
		icon={MailPlus}
		tone="neutral"
		href="/admin/invites"
	/>
</section>

<section class="mt-6 grid gap-4 lg:grid-cols-2">
	<Card>
		<CardHeader class="flex items-center justify-between">
			<CardTitle>Recent bounties</CardTitle>
			<a href="/admin/bounties" class="text-xs text-indigo-600 hover:text-indigo-800">View all →</a>
		</CardHeader>
		<div class="border-t border-zinc-100">
			{#if s.recentBounties.length === 0}
				<p class="px-5 py-8 text-center text-sm text-zinc-500">No bounties yet.</p>
			{:else}
				<Table class="rounded-none border-0">
					<TableHead>
						<TableRow hover={false}>
							<TableCell header>Title</TableCell>
							<TableCell header>Company</TableCell>
							<TableCell header>Status</TableCell>
							<TableCell header align="right">Created</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{#each s.recentBounties as bounty (bounty.id)}
							<TableRow>
								<TableCell>
									<a
										class="font-medium text-zinc-900 hover:text-indigo-600"
										href="/admin/bounties/{bounty.id}"
									>
										{bounty.title}
									</a>
								</TableCell>
								<TableCell class="text-zinc-600">
									{bounty.company?.companyName ?? '—'}
								</TableCell>
								<TableCell>
									<StatusBadge value={bounty.status} />
								</TableCell>
								<TableCell align="right" class="text-xs text-zinc-500">
									{formatDate(bounty.createdAt)}
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{/if}
		</div>
	</Card>

	<Card>
		<CardHeader class="flex items-center justify-between">
			<CardTitle>Recent signups</CardTitle>
			<a href="/admin/users" class="text-xs text-indigo-600 hover:text-indigo-800">View all →</a>
		</CardHeader>
		<div class="border-t border-zinc-100">
			{#if s.recentSignups.length === 0}
				<p class="px-5 py-8 text-center text-sm text-zinc-500">No users yet.</p>
			{:else}
				<Table class="rounded-none border-0">
					<TableHead>
						<TableRow hover={false}>
							<TableCell header>User</TableCell>
							<TableCell header>Role</TableCell>
							<TableCell header>Status</TableCell>
							<TableCell header align="right">Joined</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{#each s.recentSignups as user (user.id)}
							<TableRow>
								<TableCell>
									<a
										class="block font-medium text-zinc-900 hover:text-indigo-600"
										href="/admin/users/{user.id}"
									>
										{user.name ?? user.email}
									</a>
									{#if user.name}
										<span class="text-xs text-zinc-500">{user.email}</span>
									{/if}
								</TableCell>
								<TableCell>
									<StatusBadge value={user.role} />
								</TableCell>
								<TableCell>
									<StatusBadge value={user.isActive ? 'Active' : 'Deactivated'} />
								</TableCell>
								<TableCell align="right" class="text-xs text-zinc-500">
									{formatDate(user.createdAt)}
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{/if}
		</div>
	</Card>
</section>
