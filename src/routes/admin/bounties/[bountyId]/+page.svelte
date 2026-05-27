<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import {
		PageHeader,
		Card,
		CardHeader,
		CardTitle,
		Button,
		StatusBadge,
		Checkbox,
		Table,
		TableHead,
		TableBody,
		TableRow,
		TableCell
	} from '$lib/components/ui';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Ban from '@lucide/svelte/icons/ban';
	import { formatMoney, formatDateTime } from '$lib/utils';

	let { data } = $props();
	const b = $derived(data.bounty);

	type TabId = 'overview' | 'submissions' | 'winners' | 'payments' | 'disputes' | 'timeline';
	let tab = $state<TabId>('overview');

	const winners = $derived(data.submissions.filter((s) => s.isWinner));
	const submissionsCount = $derived(data.submissions.length);

	const tabs: { id: TabId; label: string; count?: number }[] = $derived([
		{ id: 'overview', label: 'Overview' },
		{ id: 'submissions', label: 'Submissions', count: submissionsCount },
		{ id: 'winners', label: 'Winners', count: winners.length },
		{ id: 'payments', label: 'Payments', count: data.payments.length },
		{ id: 'disputes', label: 'Disputes', count: data.disputes.length },
		{ id: 'timeline', label: 'Timeline' }
	]);

	async function toggleCreditsExempt(next: boolean) {
		const res = await fetch(`/api/admin/bounties/${b.id}/credits-exempt`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ creditsExempt: next })
		});
		if (!res.ok) {
			const j = await res.json().catch(() => ({}));
			toast.error(j?.error?.message ?? 'Could not update.');
			return;
		}
		toast.success(`Credits exempt: ${next ? 'on' : 'off'}.`);
		await invalidateAll();
	}

	async function forceCancel() {
		if (!confirm('Force-cancel this bounty? This action will trigger refunds.')) return;
		const res = await fetch(`/api/admin/bounties/${b.id}/cancel`, { method: 'POST' });
		if (!res.ok) {
			const j = await res.json().catch(() => ({}));
			toast.error(j?.error?.message ?? 'Cancel failed.');
			return;
		}
		toast.success('Bounty cancelled.');
		await invalidateAll();
	}

	const canCancel = $derived(['DRAFT', 'FUNDED', 'ACTIVE'].includes(b.status));

	type TimelineEvent = {
		label: string;
		at: Date;
		tone: 'neutral' | 'success' | 'warning' | 'danger';
	};
	const timeline = $derived.by<TimelineEvent[]>(() => {
		const events: TimelineEvent[] = [{ label: 'Created', at: b.createdAt, tone: 'neutral' }];
		if (b.publishedAt) events.push({ label: 'Published', at: b.publishedAt, tone: 'success' });
		if (
			b.status === 'FUNDED' ||
			b.status === 'ACTIVE' ||
			b.status === 'JUDGING' ||
			b.status === 'COMPLETED'
		) {
			events.push({ label: 'Escrow funded', at: b.updatedAt, tone: 'success' });
		}
		if (b.submissionDeadline) {
			events.push({
				label: 'Submission deadline',
				at: b.submissionDeadline,
				tone: new Date(b.submissionDeadline) < new Date() ? 'neutral' : 'warning'
			});
		}
		if (b.judgingDeadline) {
			events.push({ label: 'Judging deadline', at: b.judgingDeadline, tone: 'neutral' });
		}
		if (b.winnersAnnouncedAt) {
			events.push({ label: 'Winners announced', at: b.winnersAnnouncedAt, tone: 'success' });
		}
		if (b.completedAt) events.push({ label: 'Completed', at: b.completedAt, tone: 'success' });
		if (b.cancelledAt) events.push({ label: 'Cancelled', at: b.cancelledAt, tone: 'danger' });
		return events.sort((a, b) => +new Date(a.at) - +new Date(b.at));
	});
</script>

<PageHeader title={b.title} description={`${b.company.companyName} · ${b.slug}`}>
	{#snippet meta()}
		<StatusBadge value={b.status} />
		<StatusBadge value={b.type} />
		<StatusBadge value={b.compensationType} />
		<span class="text-xs text-zinc-500">
			Prize pool · <span class="font-medium text-zinc-700"
				>{formatMoney(b.totalPrizePool, b.currency)}</span
			>
		</span>
	{/snippet}
	{#snippet actions()}
		<a
			class="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
			href={`/bounties/${b.slug}`}
			target="_blank"
			rel="noopener"
		>
			Public page <ExternalLink class="h-3 w-3" />
		</a>
		<label
			class="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs"
		>
			<Checkbox
				checked={b.creditsExempt}
				onchange={(e: Event) => toggleCreditsExempt((e.currentTarget as HTMLInputElement).checked)}
			/>
			Credits exempt
		</label>
		{#if canCancel}
			<Button variant="destructive" size="sm" onclick={forceCancel}>
				<Ban class="h-3.5 w-3.5" />
				Force cancel
			</Button>
		{/if}
	{/snippet}
</PageHeader>

<div class="mb-4 flex flex-wrap items-center gap-1 border-b border-zinc-200">
	{#each tabs as t (t.id)}
		<button
			type="button"
			class={[
				'-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
				tab === t.id
					? 'border-indigo-500 text-zinc-900'
					: 'border-transparent text-zinc-500 hover:text-zinc-800'
			]}
			onclick={() => (tab = t.id)}
		>
			{t.label}
			{#if t.count !== undefined}
				<span class="ml-1 rounded-full bg-zinc-100 px-1.5 text-[10px] text-zinc-600">{t.count}</span
				>
			{/if}
		</button>
	{/each}
</div>

{#if tab === 'overview'}
	<div class="grid gap-4 lg:grid-cols-3">
		<div class="space-y-4 lg:col-span-2">
			<Card class="p-5">
				<h2 class="mb-2 text-sm font-semibold text-zinc-900">Description</h2>
				<div class="prose prose-sm max-w-none text-zinc-700">
					{@html b.description}
				</div>
			</Card>
			{#if b.requirements}
				<Card class="p-5">
					<h2 class="mb-2 text-sm font-semibold text-zinc-900">Requirements</h2>
					<div class="prose prose-sm max-w-none text-zinc-700">
						{@html b.requirements}
					</div>
				</Card>
			{/if}
			{#if b.deliverables}
				<Card class="p-5">
					<h2 class="mb-2 text-sm font-semibold text-zinc-900">Deliverables</h2>
					<div class="prose prose-sm max-w-none text-zinc-700">
						{@html b.deliverables}
					</div>
				</Card>
			{/if}
		</div>
		<div class="space-y-4">
			<Card class="p-5">
				<h2 class="mb-3 text-sm font-semibold text-zinc-900">Prize structure</h2>
				{#if b.prizeTiers.length === 0}
					<p class="text-xs text-zinc-500">No tiered prizes.</p>
				{:else}
					<ul class="space-y-2">
						{#each b.prizeTiers as tier (tier.id)}
							<li class="flex items-center justify-between text-sm">
								<span class="text-zinc-700">
									{tier.position === 99 ? 'Bonus' : `#${tier.position}`}
									{#if tier.label}
										<span class="text-zinc-400"> · {tier.label}</span>
									{/if}
								</span>
								<span class="font-medium text-zinc-900 tabular-nums">
									{formatMoney(tier.amount, b.currency)}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>
			<Card class="p-5 text-sm">
				<h2 class="mb-3 text-sm font-semibold text-zinc-900">Details</h2>
				<dl class="space-y-2 text-zinc-700">
					<div class="flex justify-between gap-3">
						<dt class="text-zinc-500">Winners</dt>
						<dd>{b.numberOfWinners}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-zinc-500">Escrow funded</dt>
						<dd class="tabular-nums">{formatMoney(b.escrowFundedAmount ?? 0, b.currency)}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-zinc-500">Submission deadline</dt>
						<dd>{formatDateTime(b.submissionDeadline)}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-zinc-500">Published</dt>
						<dd>{formatDateTime(b.publishedAt)}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-zinc-500">Skills</dt>
						<dd class="text-right">
							{#if b.skills.length === 0}
								<span class="text-zinc-400">—</span>
							{:else}
								{b.skills.map((s) => s.skill.name).join(', ')}
							{/if}
						</dd>
					</div>
				</dl>
			</Card>
		</div>
	</div>
{:else if tab === 'submissions'}
	{#if data.submissions.length === 0}
		<Card class="p-10 text-center text-sm text-zinc-500">No submissions yet.</Card>
	{:else}
		<Table>
			<TableHead>
				<TableRow hover={false}>
					<TableCell header>Freelancer</TableCell>
					<TableCell header>Label</TableCell>
					<TableCell header>Status</TableCell>
					<TableCell header>Winner</TableCell>
					<TableCell header>Link</TableCell>
					<TableCell header align="right">Submitted</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				{#each data.submissions as s (s.id)}
					<TableRow>
						<TableCell>
							<a
								class="font-medium text-zinc-900 hover:text-indigo-600"
								href="/admin/users/{s.freelancer.user.id}"
							>
								{s.freelancer.displayName}
							</a>
							<div class="text-xs text-zinc-500">{s.freelancer.user.email}</div>
						</TableCell>
						<TableCell><StatusBadge value={s.label} /></TableCell>
						<TableCell><StatusBadge value={s.status} /></TableCell>
						<TableCell>
							{#if s.isWinner}
								<span class="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
									<Trophy class="h-3 w-3" />
									#{s.winnerPosition}
								</span>
							{:else}
								<span class="text-xs text-zinc-400">—</span>
							{/if}
						</TableCell>
						<TableCell>
							<a
								href={s.link}
								target="_blank"
								rel="noopener"
								class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
							>
								Open <ExternalLink class="h-3 w-3" />
							</a>
						</TableCell>
						<TableCell align="right" class="text-xs text-zinc-500"
							>{formatDateTime(s.createdAt)}</TableCell
						>
					</TableRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
{:else if tab === 'winners'}
	{#if winners.length === 0}
		<Card class="p-10 text-center text-sm text-zinc-500">No winners selected yet.</Card>
	{:else}
		<Table>
			<TableHead>
				<TableRow hover={false}>
					<TableCell header>Position</TableCell>
					<TableCell header>Freelancer</TableCell>
					<TableCell header>Prize</TableCell>
					<TableCell header>Paid</TableCell>
					<TableCell header>Submission</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				{#each winners as w (w.id)}
					<TableRow>
						<TableCell>
							<span class="inline-flex items-center gap-1 text-sm font-medium text-amber-700">
								<Trophy class="h-3.5 w-3.5" />
								#{w.winnerPosition}
							</span>
						</TableCell>
						<TableCell>
							<a
								class="font-medium text-zinc-900 hover:text-indigo-600"
								href="/admin/users/{w.freelancer.user.id}"
							>
								{w.freelancer.displayName}
							</a>
						</TableCell>
						<TableCell class="tabular-nums">
							{w.prizeAmount ? formatMoney(w.prizeAmount, b.currency) : '—'}
						</TableCell>
						<TableCell>
							<StatusBadge
								value={w.isPaid ? 'COMPLETED' : 'PENDING'}
								label={w.isPaid ? 'Paid' : 'Pending'}
							/>
						</TableCell>
						<TableCell>
							<a
								href={w.link}
								target="_blank"
								rel="noopener"
								class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
							>
								View <ExternalLink class="h-3 w-3" />
							</a>
						</TableCell>
					</TableRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
{:else if tab === 'payments'}
	{#if data.payments.length === 0}
		<Card class="p-10 text-center text-sm text-zinc-500">No payment activity yet.</Card>
	{:else}
		<Table>
			<TableHead>
				<TableRow hover={false}>
					<TableCell header>Type</TableCell>
					<TableCell header>Status</TableCell>
					<TableCell header>Amount</TableCell>
					<TableCell header>Recipient</TableCell>
					<TableCell header>Method</TableCell>
					<TableCell header align="right">Created</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				{#each data.payments as p (p.id)}
					<TableRow>
						<TableCell><StatusBadge value={p.type} /></TableCell>
						<TableCell><StatusBadge value={p.status} /></TableCell>
						<TableCell class="tabular-nums"
							>{formatMoney(p.amount, p.currency ?? b.currency)}</TableCell
						>
						<TableCell class="text-zinc-600">
							{p.submission?.freelancer?.displayName ?? p.toEntity ?? '—'}
						</TableCell>
						<TableCell class="text-xs text-zinc-500">{p.method}</TableCell>
						<TableCell align="right" class="text-xs text-zinc-500"
							>{formatDateTime(p.createdAt)}</TableCell
						>
					</TableRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
{:else if tab === 'disputes'}
	{#if data.disputes.length === 0}
		<Card class="p-10 text-center text-sm text-zinc-500">No disputes raised.</Card>
	{:else}
		<div class="space-y-3">
			{#each data.disputes as d (d.id)}
				<Card class="p-4">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="flex items-center gap-2">
								<StatusBadge value={d.status} />
								<span class="text-xs text-zinc-500">
									{d.raisedBy.name ?? d.raisedBy.email} · {d.raisedBy.role.toLowerCase()}
								</span>
							</div>
							<p class="mt-2 text-sm whitespace-pre-wrap text-zinc-700">{d.reason}</p>
							{#if d.resolution}
								<p class="mt-2 rounded-md bg-zinc-50 p-2 text-xs text-zinc-700">
									<strong>Resolution:</strong>
									{d.resolution}
								</p>
							{/if}
						</div>
						<span class="shrink-0 text-xs text-zinc-500">{formatDateTime(d.createdAt)}</span>
					</div>
				</Card>
			{/each}
			<div class="text-right">
				<a href="/admin/disputes" class="text-xs text-indigo-600 hover:underline"
					>Manage all disputes →</a
				>
			</div>
		</div>
	{/if}
{:else if tab === 'timeline'}
	<Card class="p-5">
		<ol class="relative space-y-4 border-l-2 border-zinc-200 pl-5">
			{#each timeline as ev}
				<li class="relative">
					<span
						class={[
							'absolute -left-[27px] inline-block h-3 w-3 rounded-full ring-2 ring-white',
							ev.tone === 'success' && 'bg-emerald-500',
							ev.tone === 'warning' && 'bg-amber-500',
							ev.tone === 'danger' && 'bg-red-500',
							ev.tone === 'neutral' && 'bg-zinc-400'
						]}
					></span>
					<p class="text-sm font-medium text-zinc-900">{ev.label}</p>
					<p class="text-xs text-zinc-500">{formatDateTime(ev.at)}</p>
				</li>
			{/each}
		</ol>
	</Card>
{/if}
