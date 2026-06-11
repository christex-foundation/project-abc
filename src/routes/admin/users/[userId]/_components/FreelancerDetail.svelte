<script lang="ts">
	import {
		Card,
		Table,
		TableHead,
		TableBody,
		TableRow,
		TableCell,
		StatusBadge,
		Badge
	} from '$lib/components/ui';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Trophy from '@lucide/svelte/icons/trophy';
	import { formatMoney, formatDate, formatDateTime } from '$lib/utils';

	type Props = {
		profile: {
			id: string;
			displayName: string;
			headline: string | null;
			bio: string | null;
			portfolio: string | null;
			experienceLevel: string | null;
			creditsBalance: number;
			creditsPeriodKey: string | null;
			skills: {
				proficiencyLevel: number;
				yearsExperience: number | null;
				skill: { id: string; name: string };
			}[];
		} | null;
		submissions: {
			id: string;
			link: string;
			status: string;
			label: string;
			isWinner: boolean;
			winnerPosition: number | null;
			prizeAmount: number | null;
			isPaid: boolean;
			createdAt: Date;
			bounty: { id: string; slug: string; title: string; currency: string };
		}[];
		credits: {
			id: string;
			delta: number;
			balanceAfter: number;
			reason: string;
			createdAt: Date;
			adminUser: { email: string } | null;
		}[];
		referrals: {
			id: string;
			displayName: string;
			user: { id: string; email: string; createdAt: Date };
		}[];
		disputes: {
			id: string;
			status: string;
			reason: string;
			createdAt: Date;
			// Nullable since Dispute is polymorphic (a project dispute has no bounty).
			bounty: { id: string; slug: string; title: string } | null;
		}[];
	};

	let { profile, submissions, credits, referrals, disputes }: Props = $props();
</script>

<div class="grid gap-4 lg:grid-cols-3">
	<div class="space-y-4 lg:col-span-2">
		<Card class="p-5">
			<h2 class="text-sm font-semibold text-zinc-900">Profile</h2>
			{#if profile}
				<dl class="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
					<dt class="text-zinc-500">Display name</dt>
					<dd>{profile.displayName}</dd>
					{#if profile.headline}
						<dt class="text-zinc-500">Headline</dt>
						<dd>{profile.headline}</dd>
					{/if}
					{#if profile.experienceLevel}
						<dt class="text-zinc-500">Experience</dt>
						<dd>{profile.experienceLevel}</dd>
					{/if}
					{#if profile.portfolio}
						<dt class="text-zinc-500">Portfolio</dt>
						<dd>
							<a
								href={profile.portfolio}
								target="_blank"
								rel="noopener"
								class="break-all text-indigo-600 hover:underline"
							>
								{profile.portfolio}
							</a>
						</dd>
					{/if}
				</dl>
				{#if profile.bio}
					<p class="mt-3 text-sm whitespace-pre-wrap text-zinc-700">{profile.bio}</p>
				{/if}
				{#if profile.skills.length > 0}
					<div class="mt-4 flex flex-wrap gap-1.5">
						{#each profile.skills as s}
							<Badge variant="secondary">{s.skill.name} · L{s.proficiencyLevel}</Badge>
						{/each}
					</div>
				{/if}
			{:else}
				<p class="mt-2 text-sm text-zinc-500">No freelancer profile.</p>
			{/if}
		</Card>

		<Card>
			<header class="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
				<h2 class="text-sm font-semibold text-zinc-900">Submissions ({submissions.length})</h2>
			</header>
			{#if submissions.length === 0}
				<p class="px-5 py-6 text-center text-sm text-zinc-500">No submissions.</p>
			{:else}
				<Table class="rounded-none border-0">
					<TableHead>
						<TableRow hover={false}>
							<TableCell header>Bounty</TableCell>
							<TableCell header>Label</TableCell>
							<TableCell header>Winner</TableCell>
							<TableCell header>Prize</TableCell>
							<TableCell header align="right">Submitted</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{#each submissions as s (s.id)}
							<TableRow>
								<TableCell>
									<a
										class="font-medium text-zinc-900 hover:text-indigo-600"
										href="/admin/bounties/{s.bounty.id}"
									>
										{s.bounty.title}
									</a>
								</TableCell>
								<TableCell><StatusBadge value={s.label} /></TableCell>
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
								<TableCell class="text-xs tabular-nums">
									{s.prizeAmount ? formatMoney(s.prizeAmount, s.bounty.currency) : '—'}
								</TableCell>
								<TableCell align="right" class="text-xs text-zinc-500"
									>{formatDate(s.createdAt)}</TableCell
								>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{/if}
		</Card>

		<Card>
			<header class="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
				<h2 class="text-sm font-semibold text-zinc-900">Disputes raised ({disputes.length})</h2>
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
										{#if d.bounty}
											<a
												class="text-sm font-medium text-zinc-900 hover:text-indigo-600"
												href="/admin/bounties/{d.bounty.id}"
											>
												{d.bounty.title}
											</a>
										{:else}
											<span class="text-sm font-medium text-zinc-500">—</span>
										{/if}
									</div>
									<p class="mt-1 line-clamp-2 text-xs text-zinc-600">{d.reason}</p>
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
		<Card class="p-5">
			<h2 class="text-sm font-semibold text-zinc-900">Credits</h2>
			{#if profile}
				<p class="mt-2 text-3xl font-semibold text-zinc-900 tabular-nums">
					{profile.creditsBalance}
				</p>
				<p class="text-xs text-zinc-500">Period: {profile.creditsPeriodKey ?? 'not set'}</p>
			{:else}
				<p class="mt-2 text-sm text-zinc-500">No profile, no credits.</p>
			{/if}
		</Card>

		<Card>
			<header class="border-b border-zinc-100 px-5 py-3">
				<h2 class="text-sm font-semibold text-zinc-900">Recent ledger</h2>
			</header>
			{#if credits.length === 0}
				<p class="px-5 py-6 text-center text-sm text-zinc-500">No transactions.</p>
			{:else}
				<ul class="divide-y divide-zinc-100 text-sm">
					{#each credits as t (t.id)}
						<li class="px-5 py-2.5">
							<div class="flex items-center justify-between gap-2">
								<span class="text-xs text-zinc-600"
									>{t.reason.replaceAll('_', ' ').toLowerCase()}</span
								>
								<span
									class={t.delta > 0
										? 'text-emerald-700 tabular-nums'
										: 'text-red-700 tabular-nums'}
								>
									{t.delta > 0 ? '+' : ''}{t.delta}
								</span>
							</div>
							<div class="flex items-center justify-between text-[11px] text-zinc-500">
								<span>{formatDateTime(t.createdAt)}</span>
								<span>balance {t.balanceAfter}</span>
							</div>
							{#if t.adminUser}
								<div class="text-[11px] text-zinc-400">by {t.adminUser.email}</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</Card>

		<Card>
			<header class="border-b border-zinc-100 px-5 py-3">
				<h2 class="text-sm font-semibold text-zinc-900">Referrals ({referrals.length})</h2>
			</header>
			{#if referrals.length === 0}
				<p class="px-5 py-6 text-center text-sm text-zinc-500">No referrals yet.</p>
			{:else}
				<ul class="divide-y divide-zinc-100 text-sm">
					{#each referrals as r (r.id)}
						<li class="flex items-center justify-between px-5 py-2.5">
							<a
								class="font-medium text-zinc-900 hover:text-indigo-600"
								href="/admin/users/{r.user.id}"
							>
								{r.displayName}
							</a>
							<span class="text-xs text-zinc-500">{formatDate(r.user.createdAt)}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>
	</div>
</div>
