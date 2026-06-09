<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { page } from '$app/state';
	import RichTextView from '$lib/components/editor/RichTextView.svelte';
	import CoachPanel from '$lib/components/ai/CoachPanel.svelte';
	import {
		Button,
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		Badge,
		Separator
	} from '$lib/components/ui';
	import { cloudinaryThumb } from '$lib/utils';

	let { data } = $props();
	const b = $derived(data.bounty);

	function formatMoney(minor: number, currency: string) {
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	// Reactive deadline countdown.
	let now = $state(Date.now());
	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 60_000);
		return () => clearInterval(id);
	});
	const countdown = $derived.by(() => {
		const ms = new Date(b.submissionDeadline).getTime() - now;
		if (ms <= 0) return { label: 'Submissions closed', ago: true };
		const days = Math.floor(ms / 86_400_000);
		const hours = Math.floor((ms % 86_400_000) / 3_600_000);
		if (days >= 1) return { label: `${days}d ${hours}h left`, ago: false };
		const mins = Math.floor((ms % 3_600_000) / 60_000);
		return { label: `${hours}h ${mins}m left`, ago: false };
	});

	const regularTiers = $derived(b.prizeTiers.filter((t) => t.position !== 99));
	const bonusTiers = $derived(b.prizeTiers.filter((t) => t.position === 99));
	const eligibility = $derived(
		(b.eligibility ?? []) as Array<{ question: string; optional: boolean }>
	);
</script>

<MetaTags
	title={b.title}
	description={data.pageMetaTags.description}
	canonical={`${page.url.origin}/bounties/${b.slug}`}
	openGraph={{
		type: 'website',
		title: b.title,
		description: data.pageMetaTags.description,
		images: b.company?.logo ? [{ url: b.company.logo, alt: b.company.companyName }] : undefined
	}}
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(data.jsonLd)}</script>`}
</svelte:head>

<article class="space-y-6">
	<header class="space-y-3">
		<div class="flex items-center gap-2">
			<Badge variant={b.type === 'PROJECT' ? 'secondary' : 'default'}>{b.type}</Badge>
			<Badge variant="outline">{b.status}</Badge>
			<Badge variant={countdown.ago ? 'destructive' : 'success'}>{countdown.label}</Badge>
		</div>
		<h1 class="fow-display text-ink text-4xl sm:text-5xl">{b.title}</h1>
		<div class="text-ink-soft flex items-center gap-3 text-sm">
			{#if b.company?.logo}
				<img
					src={cloudinaryThumb(b.company.logo, 64)}
					alt=""
					width="32"
					height="32"
					loading="lazy"
					decoding="async"
					class="h-8 w-8 rounded-full object-cover"
				/>
			{/if}
			<span>{b.company?.companyName ?? b.companyNameSnapshot ?? 'Anonymous sponsor'}</span>
			{#if b.company?.website}
				<a href={b.company.website} target="_blank" rel="noopener noreferrer" class="underline"
					>website</a
				>
			{/if}
		</div>
	</header>

	<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
		<div class="space-y-6">
			<Card>
				<CardHeader><CardTitle>Description</CardTitle></CardHeader>
				<CardContent>
					<RichTextView html={b.description} />
				</CardContent>
			</Card>

			{#if b.requirements}
				<Card>
					<CardHeader><CardTitle>Requirements</CardTitle></CardHeader>
					<CardContent><RichTextView html={b.requirements} /></CardContent>
				</Card>
			{/if}

			{#if b.deliverables}
				<Card>
					<CardHeader><CardTitle>Deliverables</CardTitle></CardHeader>
					<CardContent><RichTextView html={b.deliverables} /></CardContent>
				</Card>
			{/if}

			{#if eligibility.length > 0}
				<Card>
					<CardHeader><CardTitle>Eligibility questions</CardTitle></CardHeader>
					<CardContent>
						<ul class="space-y-2 text-sm">
							{#each eligibility as q, i (i)}
								<li class="flex gap-2">
									<span class="text-ink-soft">{i + 1}.</span>
									<span>
										{q.question}
										{#if q.optional}
											<span class="text-ink-soft ml-1 text-xs">(optional)</span>
										{/if}
									</span>
								</li>
							{/each}
						</ul>
					</CardContent>
				</Card>
			{/if}
		</div>

		<aside class="space-y-4">
			<Card>
				<CardHeader><CardTitle>Compensation</CardTitle></CardHeader>
				<CardContent class="space-y-3 text-sm">
					{#if b.compensationType === 'FIXED'}
						<p class="text-xl font-semibold">{formatMoney(b.totalPrizePool, b.currency)}</p>
						<p class="text-ink-soft">
							{b.numberOfWinners} winner{b.numberOfWinners === 1 ? '' : 's'}
						</p>
						{#if regularTiers.length > 0}
							<div class="space-y-1">
								{#each regularTiers as t (t.id)}
									<div class="flex justify-between">
										<span>#{t.position}{t.label ? ` — ${t.label}` : ''}</span>
										<span class="font-medium">{formatMoney(t.amount, b.currency)}</span>
									</div>
								{/each}
							</div>
						{/if}
						{#if bonusTiers.length > 0}
							<Separator />
							<p class="text-ink-soft text-xs">Bonus pool (up to {b.maxBonusSpots})</p>
							{#each bonusTiers as t (t.id)}
								<div class="flex justify-between">
									<span>Bonus{t.label ? ` — ${t.label}` : ''}</span>
									<span class="font-medium">{formatMoney(t.amount, b.currency)} ea.</span>
								</div>
							{/each}
						{/if}
					{:else if b.compensationType === 'RANGE'}
						<p class="text-xl font-semibold">
							{formatMoney(b.minRewardAsk ?? 0, b.currency)} – {formatMoney(
								b.maxRewardAsk ?? 0,
								b.currency
							)}
						</p>
						<p class="text-ink-soft">Propose your ask within this range.</p>
					{:else}
						<p class="text-xl font-semibold">Freelancer-proposed</p>
						<p class="text-ink-soft">Suggest your own price in the submission.</p>
					{/if}
				</CardContent>
			</Card>

			<Card>
				<CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
				<CardContent class="space-y-2 text-sm">
					<div>
						<div class="text-ink-soft text-xs">Submission deadline</div>
						<div class="font-medium">{new Date(b.submissionDeadline).toLocaleString()}</div>
					</div>
					{#if b.judgingDeadline}
						<div>
							<div class="text-ink-soft text-xs">Judging deadline</div>
							<div class="font-medium">{new Date(b.judgingDeadline).toLocaleString()}</div>
						</div>
					{/if}
					{#if b.timeToComplete}
						<div>
							<div class="text-ink-soft text-xs">Time to complete</div>
							<div class="font-medium">{b.timeToComplete}</div>
						</div>
					{/if}
				</CardContent>
			</Card>

			{#if b.skills.length > 0}
				<Card>
					<CardHeader><CardTitle>Skills</CardTitle></CardHeader>
					<CardContent>
						<div class="flex flex-wrap gap-1">
							{#each b.skills as s (s.id)}
								<Badge variant={s.isRequired ? 'default' : 'outline'}>
									{s.skill.name}{s.isRequired ? ' *' : ''}
								</Badge>
							{/each}
						</div>
						<p class="text-ink-soft mt-2 text-xs">* = required</p>
					</CardContent>
				</Card>
			{/if}

			{#if page.data.user?.role === 'FREELANCER'}
				<CoachPanel kind="BOUNTY" bountyId={b.id} slug={b.slug} aiEnabled={data.aiEnabled} />
			{/if}

			{#if page.data.user?.role === 'FREELANCER' && b.status === 'ACTIVE' && !countdown.ago}
				<Button class="w-full" href={`/bounties/${b.slug}/submit`}>Submit work</Button>
			{:else if !page.data.user}
				<Button
					class="w-full"
					href={`/login?next=${encodeURIComponent(`/bounties/${b.slug}/submit`)}`}
				>
					Sign in to submit
				</Button>
			{:else if b.status !== 'ACTIVE'}
				<Button class="w-full" disabled>Submissions closed</Button>
			{:else}
				<Button class="w-full" disabled>Submissions closed</Button>
			{/if}
		</aside>
	</div>
</article>
