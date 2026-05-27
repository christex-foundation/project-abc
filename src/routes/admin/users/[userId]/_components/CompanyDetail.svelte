<script lang="ts">
	import {
		Card,
		Table,
		TableHead,
		TableBody,
		TableRow,
		TableCell,
		StatusBadge
	} from '$lib/components/ui';
	import { formatMoney, formatDate, formatDateTime } from '$lib/utils';

	type Props = {
		profile: {
			id: string;
			companyName: string;
			description: string | null;
			website: string | null;
			industry: string | null;
			country: string | null;
			verified: boolean;
			monimeFinancialAccountId: string | null;
			createdAt: Date;
		} | null;
		bounties: {
			id: string;
			slug: string;
			title: string;
			status: string;
			type: string;
			totalPrizePool: number;
			currency: string;
			createdAt: Date;
			_count: { submissions: number };
		}[];
		payments: {
			id: string;
			type: string;
			status: string;
			amount: number;
			currency: string;
			createdAt: Date;
			bounty: { id: string; title: string; slug: string };
		}[];
		disputes: {
			id: string;
			status: string;
			reason: string;
			createdAt: Date;
			raisedBy: { id: string; name: string | null; email: string; role: string };
			bounty: { id: string; slug: string; title: string };
		}[];
	};

	let { profile, bounties, payments, disputes }: Props = $props();
</script>

<div class="grid gap-4 lg:grid-cols-3">
	<div class="space-y-4 lg:col-span-2">
		<Card class="p-5">
			<div class="flex items-start justify-between gap-3">
				<h2 class="text-sm font-semibold text-zinc-900">Company profile</h2>
				{#if profile?.verified}
					<StatusBadge value="ACCEPTED" label="Verified" />
				{/if}
			</div>
			{#if profile}
				<dl class="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
					<dt class="text-zinc-500">Name</dt>
					<dd>{profile.companyName || '—'}</dd>
					{#if profile.industry}
						<dt class="text-zinc-500">Industry</dt>
						<dd>{profile.industry}</dd>
					{/if}
					{#if profile.country}
						<dt class="text-zinc-500">Country</dt>
						<dd>{profile.country}</dd>
					{/if}
					{#if profile.website}
						<dt class="text-zinc-500">Website</dt>
						<dd>
							<a
								href={profile.website}
								target="_blank"
								rel="noopener"
								class="text-indigo-600 hover:underline"
							>
								{profile.website}
							</a>
						</dd>
					{/if}
					<dt class="text-zinc-500">Monime account</dt>
					<dd class="font-mono text-xs">{profile.monimeFinancialAccountId ?? '—'}</dd>
				</dl>
				{#if profile.description}
					<p class="mt-3 text-sm whitespace-pre-wrap text-zinc-700">{profile.description}</p>
				{/if}
			{:else}
				<p class="mt-2 text-sm text-zinc-500">No company profile yet.</p>
			{/if}
		</Card>

		<Card>
			<header class="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
				<h2 class="text-sm font-semibold text-zinc-900">Bounties ({bounties.length})</h2>
			</header>
			{#if bounties.length === 0}
				<p class="px-5 py-6 text-center text-sm text-zinc-500">No bounties posted.</p>
			{:else}
				<Table class="rounded-none border-0">
					<TableHead>
						<TableRow hover={false}>
							<TableCell header>Title</TableCell>
							<TableCell header>Status</TableCell>
							<TableCell header>Prize</TableCell>
							<TableCell header align="right">Subs</TableCell>
							<TableCell header align="right">Created</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{#each bounties as b (b.id)}
							<TableRow>
								<TableCell>
									<a
										class="font-medium text-zinc-900 hover:text-indigo-600"
										href="/admin/bounties/{b.id}"
									>
										{b.title}
									</a>
								</TableCell>
								<TableCell><StatusBadge value={b.status} /></TableCell>
								<TableCell class="text-xs tabular-nums"
									>{formatMoney(b.totalPrizePool, b.currency)}</TableCell
								>
								<TableCell align="right" class="text-xs">{b._count.submissions}</TableCell>
								<TableCell align="right" class="text-xs text-zinc-500"
									>{formatDate(b.createdAt)}</TableCell
								>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{/if}
		</Card>

		<Card>
			<header class="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
				<h2 class="text-sm font-semibold text-zinc-900">Disputes received ({disputes.length})</h2>
			</header>
			{#if disputes.length === 0}
				<p class="px-5 py-6 text-center text-sm text-zinc-500">None.</p>
			{:else}
				<ul class="divide-y divide-zinc-100">
					{#each disputes as d (d.id)}
						<li class="px-5 py-3">
							<div class="flex items-start justify-between gap-3">
								<div>
									<div class="flex items-center gap-2">
										<StatusBadge value={d.status} />
										<a
											class="text-sm font-medium text-zinc-900 hover:text-indigo-600"
											href="/admin/bounties/{d.bounty.id}"
										>
											{d.bounty.title}
										</a>
									</div>
									<p class="mt-1 line-clamp-2 text-xs text-zinc-600">{d.reason}</p>
									<p class="text-[11px] text-zinc-400">
										Raised by {d.raisedBy.name ?? d.raisedBy.email} ({d.raisedBy.role.toLowerCase()})
									</p>
								</div>
								<span class="shrink-0 text-xs text-zinc-500">{formatDate(d.createdAt)}</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>
	</div>

	<div class="space-y-4">
		<Card>
			<header class="border-b border-zinc-100 px-5 py-3">
				<h2 class="text-sm font-semibold text-zinc-900">Payments ({payments.length})</h2>
			</header>
			{#if payments.length === 0}
				<p class="px-5 py-6 text-center text-sm text-zinc-500">No payment activity.</p>
			{:else}
				<ul class="divide-y divide-zinc-100 text-sm">
					{#each payments as p (p.id)}
						<li class="px-5 py-2.5">
							<div class="flex items-center justify-between gap-2">
								<a
									class="text-xs font-medium text-zinc-900 hover:text-indigo-600"
									href="/admin/bounties/{p.bounty.id}"
								>
									{p.bounty.title}
								</a>
								<StatusBadge value={p.status} />
							</div>
							<div class="mt-0.5 flex items-center justify-between text-[11px] text-zinc-500">
								<span>{p.type.replaceAll('_', ' ').toLowerCase()}</span>
								<span class="tabular-nums">{formatMoney(p.amount, p.currency)}</span>
							</div>
							<div class="text-[11px] text-zinc-400">{formatDateTime(p.createdAt)}</div>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>
	</div>
</div>
