<script lang="ts">
	import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui';
	import KenteRule from '$lib/components/marketing/KenteRule.svelte';
	import { formatMoneyCompact, formatRelative } from '$lib/utils';

	let { data } = $props();

	function formatMoneyMajor(minor: number | null | undefined, currency: string) {
		if (minor == null) return '—';
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	function daysUntil(d: Date | string): string {
		const ms = new Date(d).getTime() - Date.now();
		if (ms <= 0) return 'closed';
		const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
		return `${days}d`;
	}

	const submissions = $derived(data.submissions);
	const earnings = $derived(data.earnings);
	const recommendations = $derived(data.recommendations);
	const notifications = $derived(data.notifications);
	const isProfileComplete = $derived(data.isProfileComplete);

	const totalEarned = $derived(
		earnings.filter((e) => e.status === 'COMPLETED').reduce((s, e) => s + e.amount, 0)
	);
	const inTransit = $derived(
		earnings
			.filter((e) => e.status === 'PROCESSING' || e.status === 'PENDING')
			.reduce((s, e) => s + e.amount, 0)
	);
	const currency = $derived(earnings[0]?.currency ?? 'SLE');
	const activeCount = $derived(submissions.filter((s) => !s.bounty.isWinnersAnnounced).length);
	const winsCount = $derived(submissions.filter((s) => s.isWinner).length);
	const recentSubmissions = $derived(submissions.slice(0, 5));
	const credits = $derived(data.credits);
	const creditTransactions = $derived(data.creditTransactions);
	const referrals = $derived(data.referrals);

	const REASON_LABEL: Record<string, string> = {
		MONTHLY_RESET: 'Monthly reset',
		SUBMISSION_SPEND: 'Submission',
		WIN_BONUS: 'Win bonus',
		SPAM_PENALTY: 'Spam penalty',
		ADMIN_GRANT: 'Admin grant',
		ADMIN_REVOKE: 'Admin revoke',
		REFERRAL_FIRST_SUBMISSION: 'Referral — first submission',
		REFERRAL_WIN_BONUS: 'Referral — win bonus',
		REFERRAL_REVERSAL: 'Referral — reversed (spam)'
	};

	let copiedCode = $state(false);
	let copiedLink = $state(false);

	async function copy(value: string, which: 'code' | 'link') {
		try {
			await navigator.clipboard.writeText(value);
			if (which === 'code') {
				copiedCode = true;
				setTimeout(() => (copiedCode = false), 1500);
			} else {
				copiedLink = true;
				setTimeout(() => (copiedLink = false), 1500);
			}
		} catch {
			// Clipboard unavailable — silently no-op; user can long-press the field.
		}
	}
</script>

<div class="fow-reveal space-y-8">
	<!-- Hero header -->
	<header
		class="border-bone bg-paper relative overflow-hidden rounded-3xl border px-6 py-8 sm:px-10"
		data-reveal-step="1"
	>
		<div class="pointer-events-none absolute -top-16 -right-16">
			<div class="bg-terracotta/10 h-56 w-56 rounded-full blur-3xl"></div>
		</div>
		<div class="relative flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-ink-soft text-[11px] tracking-wide uppercase">Your studio</p>
				<h1
					class="font-display text-ink mt-2 text-4xl font-semibold tracking-tight sm:text-5xl"
					style="font-variation-settings: 'opsz' 144, 'wght' 600;"
				>
					Earnings, work,
					<span class="text-terracotta italic">and matches.</span>
				</h1>
			</div>
			<div class="flex flex-col items-end gap-2">
				{#if data.rating?.count}
					<span class="text-sm font-medium text-amber-600">
						★ {data.rating.avg} · {data.rating.count} review{data.rating.count === 1 ? '' : 's'}
					</span>
				{/if}
				<div class="flex flex-wrap gap-2">
					<Button href="/dashboard/freelancer/proposals" variant="outline">My proposals</Button>
					<Button href="/bounties" class="bg-ink text-cream hover:bg-terracotta"
						>Browse bounties</Button
					>
				</div>
			</div>
		</div>
	</header>

	<!-- Personal stat band -->
	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-reveal-step="2">
		<div class="border-bone bg-forest text-forest-soft rounded-2xl border px-5 py-5">
			<p class="text-forest-soft/70 text-[11px] tracking-wide uppercase">Total earned</p>
			<p
				class="font-display text-cream mt-2 text-3xl font-semibold tabular-nums"
				style="font-variation-settings: 'opsz' 144, 'wght' 600;"
			>
				{formatMoneyCompact(totalEarned, 'Le')}
			</p>
			<p class="text-forest-soft/70 mt-1 text-xs">{currency} · completed payouts</p>
		</div>
		<div class="border-bone bg-cream rounded-2xl border px-5 py-5">
			<p class="text-ink-soft text-[11px] tracking-wide uppercase">In transit</p>
			<p
				class="font-display text-ink mt-2 text-3xl font-semibold tabular-nums"
				style="font-variation-settings: 'opsz' 144, 'wght' 600;"
			>
				{formatMoneyCompact(inTransit, 'Le')}
			</p>
			<p class="text-ink-soft mt-1 text-xs">Pending / processing</p>
		</div>
		<div class="border-bone bg-cream rounded-2xl border px-5 py-5">
			<p class="text-ink-soft text-[11px] tracking-wide uppercase">Active submissions</p>
			<p
				class="font-display text-ink mt-2 text-3xl font-semibold tabular-nums"
				style="font-variation-settings: 'opsz' 144, 'wght' 600;"
			>
				{activeCount}
			</p>
			<p class="text-ink-soft mt-1 text-xs">Awaiting judging</p>
		</div>
		<div class="border-terracotta bg-terracotta text-cream rounded-2xl border px-5 py-5">
			<p class="text-cream/75 text-[11px] tracking-wide uppercase">Wins</p>
			<p
				class="font-display mt-2 text-3xl font-semibold tabular-nums"
				style="font-variation-settings: 'opsz' 144, 'wght' 600;"
			>
				{winsCount}
			</p>
			<p class="text-cream/75 mt-1 text-xs">All time</p>
		</div>
	</div>

	{#if credits}
		<div class="border-bone bg-ochre-soft rounded-2xl border px-5 py-5" data-reveal-step="3">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<div>
					<p class="text-clay text-[11px] tracking-wide uppercase">Credits this month</p>
					<p
						class="font-display text-ink mt-2 text-4xl font-semibold tabular-nums"
						style="font-variation-settings: 'opsz' 144, 'wght' 600;"
					>
						{credits.balance}
						<span class="text-ink-soft text-xl">/ {credits.monthlyAllocation}</span>
					</p>
					<p class="text-clay mt-1 text-xs">Resets on the 1st</p>
				</div>
				<div class="bg-cream h-2 w-full max-w-xs overflow-hidden rounded-full sm:w-48">
					<div
						class="bg-clay h-full rounded-full transition-all"
						style="width: {Math.min(
							100,
							(credits.balance / Math.max(1, credits.monthlyAllocation)) * 100
						)}%"
					></div>
				</div>
			</div>
		</div>
	{/if}

	<div data-reveal-step="4">
		<KenteRule />
	</div>

	{#if referrals?.enabled}
		<Card data-reveal-step="5">
			<CardHeader>
				<CardTitle class="text-base">Get one credit for every friend you invite</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<p class="text-ink-soft text-sm">
					You get {referrals.creditsPerFirstSubmission} credit when a friend you invited makes a non-spam
					submission. You also get {referrals.creditsPerWin} bonus credits every time they win.
				</p>

				<div class="flex items-baseline gap-2">
					<span class="font-display text-ink text-3xl font-semibold">{referrals.remaining}</span>
					<span class="text-ink-soft text-sm">/ {referrals.cap} invites left</span>
					<a href="/legal/referrals" class="text-ink-soft ml-auto text-xs underline">Read terms</a>
				</div>

				<div>
					<div class="text-ink-soft text-[11px] tracking-wide uppercase">Your code</div>
					<div class="mt-1 flex items-center gap-2">
						<code
							class="bg-paper text-ink rounded-lg px-3 py-1.5 font-mono text-sm font-semibold tracking-wider"
						>
							{referrals.code}
						</code>
						<button
							type="button"
							onclick={() => copy(referrals!.code, 'code')}
							class="text-ink-soft hover:text-ink text-xs underline transition-colors"
						>
							{copiedCode ? 'Copied!' : 'Copy'}
						</button>
					</div>
				</div>

				<div>
					<div class="text-ink-soft text-[11px] tracking-wide uppercase">Share link</div>
					<div class="mt-1 flex items-center gap-2">
						<input
							readonly
							value={referrals.link}
							class="border-bone bg-paper min-w-0 flex-1 rounded-lg border px-2 py-1 font-mono text-xs"
						/>
						<button
							type="button"
							onclick={() => copy(referrals!.link, 'link')}
							class="text-ink-soft hover:text-ink text-xs underline transition-colors"
						>
							{copiedLink ? 'Copied!' : 'Copy'}
						</button>
					</div>
				</div>

				{#if referrals.referrals.length > 0}
					<details class="text-sm">
						<summary class="text-ink-soft cursor-pointer">
							Friends you've invited ({referrals.referrals.length})
						</summary>
						<ul class="mt-2 space-y-1">
							{#each referrals.referrals as r (r.id)}
								<li
									class="border-bone flex items-center justify-between border-b py-1.5 text-xs last:border-0"
								>
									<span class="truncate">{r.displayName}</span>
									<span class="flex shrink-0 items-center gap-1.5">
										{#if !r.emailVerified}
											<Badge variant="outline">Pending verification</Badge>
										{:else if r.hasSubmitted}
											<Badge variant="success">Submitted</Badge>
										{:else}
											<Badge variant="secondary">Signed up</Badge>
										{/if}
										{#if r.winCount > 0}
											<Badge variant="success">{r.winCount} win{r.winCount === 1 ? '' : 's'}</Badge>
										{/if}
									</span>
								</li>
							{/each}
						</ul>
					</details>
				{/if}
			</CardContent>
		</Card>
	{/if}

	{#if credits && creditTransactions.length > 0}
		<Card data-reveal-step="6">
			<CardHeader>
				<CardTitle class="text-base">Recent credit activity</CardTitle>
			</CardHeader>
			<CardContent class="space-y-2">
				{#each creditTransactions as t (t.id)}
					<div
						class="border-bone flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0"
					>
						<div class="min-w-0 flex-1">
							<div class="text-sm">
								{REASON_LABEL[t.reason] ?? t.reason}
								{#if t.submission?.bounty?.title}
									<span class="text-ink-soft">— {t.submission.bounty.title}</span>
								{/if}
							</div>
							{#if t.notes}
								<div class="text-ink-soft text-xs">{t.notes}</div>
							{/if}
						</div>
						<div class="flex shrink-0 items-center gap-2 text-xs">
							<span
								class={t.delta > 0
									? 'text-forest font-medium'
									: t.delta < 0
										? 'font-medium text-red-700'
										: 'text-ink-soft'}
							>
								{t.delta > 0 ? '+' : ''}{t.delta}
							</span>
							<span class="text-ink-soft/60">→ {t.balanceAfter}</span>
						</div>
					</div>
				{/each}
			</CardContent>
		</Card>
	{/if}

	<Card data-reveal-step="7">
		<CardHeader>
			<div class="flex items-center justify-between">
				<CardTitle class="text-base">Matched to your skills</CardTitle>
				<a
					href="/dashboard/freelancer/recommendations"
					class="text-ink-soft hover:text-ink text-sm hover:underline"
				>
					See all →
				</a>
			</div>
		</CardHeader>
		<CardContent>
			{#if recommendations.length === 0 && !isProfileComplete}
				<div class="space-y-3 py-4 text-center">
					<div class="text-ink-soft text-sm">
						Complete your profile — add a headline, bio, and at least one skill — and we'll match
						you to live bounties.
					</div>
					<Button href="/dashboard/freelancer/profile" size="sm">Complete your profile</Button>
				</div>
			{:else if recommendations.length === 0}
				<div class="space-y-3 py-4 text-center">
					<div class="text-ink-soft text-sm">
						We're matching you to live bounties — check back soon, or browse all open bounties.
					</div>
					<Button href="/bounties" size="sm">Browse bounties</Button>
				</div>
			{:else}
				<div class="grid gap-3 md:grid-cols-2">
					{#each recommendations as r (r.bounty.id)}
						<a
							href={`/bounties/${r.bounty.slug}`}
							class="fow-card border-bone bg-cream block rounded-xl border p-3"
						>
							<div class="flex items-start justify-between gap-2">
								<span class="text-ink text-sm font-medium">{r.bounty.title}</span>
								<Badge variant="outline">{Math.round(r.matchScore * 100)}%</Badge>
							</div>
							<div class="text-ink-soft mt-2 flex flex-wrap items-center gap-2 text-xs">
								<Badge variant="outline">{r.bounty.type}</Badge>
								<span class="font-mono tabular-nums">
									{formatMoneyMajor(r.bounty.totalPrizePool, r.bounty.currency)}
								</span>
								<span>Closes {daysUntil(r.bounty.submissionDeadline)}</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>

	<Card data-reveal-step="8">
		<CardHeader>
			<div class="flex items-center justify-between">
				<CardTitle class="text-base">Recent submissions</CardTitle>
				<a
					href="/dashboard/freelancer/submissions"
					class="text-ink-soft hover:text-ink text-sm hover:underline"
				>
					All submissions →
				</a>
			</div>
		</CardHeader>
		<CardContent class="space-y-2">
			{#if recentSubmissions.length === 0}
				<div class="text-ink-soft py-4 text-center text-sm">
					You haven't submitted to any bounties yet.
					<a href="/bounties" class="text-ink underline">Browse bounties</a>.
				</div>
			{:else}
				{#each recentSubmissions as s (s.id)}
					<div
						class="border-bone flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
					>
						<div class="min-w-0 flex-1">
							<a
								href={`/bounties/${s.bounty.slug}`}
								class="text-ink block truncate text-sm font-medium hover:underline"
							>
								{s.bounty.title}
							</a>
							<div class="mt-1 flex flex-wrap items-center gap-1.5">
								<Badge variant="outline">{s.bounty.type}</Badge>
								{#if s.isWinner}
									<Badge variant="success">Winner — pos {s.winnerPosition}</Badge>
								{:else if s.bounty.isWinnersAnnounced}
									<Badge variant="secondary">Not selected</Badge>
								{:else}
									<Badge variant="outline">Submitted</Badge>
								{/if}
								{#if s.prizeAmount != null}
									<span class="text-ink-soft text-xs">
										{formatMoneyMajor(s.prizeAmount, s.bounty.currency)}
									</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<div class="flex items-center justify-between">
				<CardTitle class="text-base">Recent activity</CardTitle>
				<a href="/notifications" class="text-ink-soft hover:text-ink text-sm hover:underline"
					>See all →</a
				>
			</div>
		</CardHeader>
		<CardContent class="space-y-2">
			{#if notifications.length === 0}
				<div class="text-ink-soft py-4 text-center text-sm">No recent activity yet.</div>
			{:else}
				{#each notifications as n (n.id)}
					<a
						href={n.link ?? '/notifications'}
						class="border-bone hover:bg-paper block border-b py-2 last:border-0"
					>
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="text-ink text-sm font-medium">{n.title}</div>
								{#if n.message}
									<div class="text-ink-soft truncate text-xs">{n.message}</div>
								{/if}
							</div>
							<span class="text-ink-soft/60 shrink-0 text-xs">{formatRelative(n.createdAt)}</span>
						</div>
					</a>
				{/each}
			{/if}
		</CardContent>
	</Card>
</div>
