<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { page } from '$app/state';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui';
	import UserAvatar from '$lib/components/shared/UserAvatar.svelte';
	import BountyCard from '$lib/components/feed/BountyCard.svelte';
	import ProjectCard from '$lib/components/feed/ProjectCard.svelte';
	import { cloudinaryThumb, formatMoney, formatMoneyCompact } from '$lib/utils';
	import { PROVINCE_LABEL, DISTRICT_LABEL, type Province, type District } from '$lib/constants/geo';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import Trophy from '@lucide/svelte/icons/trophy';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import MapPin from '@lucide/svelte/icons/map-pin';

	let { data } = $props();
	const p = $derived(data.profile);
	const isGuest = $derived(!page.data.user);

	function memberSince(d: Date | string): string {
		return new Date(d).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
	}

	function locationLabel(province: string | null, district: string | null): string | null {
		if (!province) return null;
		const prov = PROVINCE_LABEL[province as Province] ?? province;
		const dist = district ? (DISTRICT_LABEL[district as District] ?? district) : null;
		return dist ? `${dist}, ${prov}` : prov;
	}

	const EXPERIENCE_LABEL: Record<string, string> = {
		JUNIOR: 'Junior',
		MID: 'Mid-level',
		SENIOR: 'Senior'
	};

	function placement(pos: number | null): { label: string; tone: string } {
		if (pos === 99) return { label: 'Bonus', tone: 'bg-ochre-soft text-clay' };
		if (pos === 1) return { label: '1st', tone: 'bg-ochre-soft text-clay' };
		if (pos === 2) return { label: '2nd', tone: 'bg-bone text-ink' };
		if (pos === 3) return { label: '3rd', tone: 'bg-terracotta-soft text-terracotta' };
		if (pos) return { label: `${pos}th`, tone: 'bg-paper text-ink-soft' };
		return { label: 'Won', tone: 'bg-forest-soft text-forest' };
	}
</script>

<MetaTags
	title={data.pageMetaTags.title}
	description={data.pageMetaTags.description}
	canonical={data.canonical}
	openGraph={{
		type: 'profile',
		title: data.pageMetaTags.title,
		description: data.pageMetaTags.description,
		images: data.pageMetaTags.image
			? [{ url: data.pageMetaTags.image, alt: data.pageMetaTags.title }]
			: undefined
	}}
	twitter={{
		cardType: 'summary_large_image',
		title: data.pageMetaTags.title,
		description: data.pageMetaTags.description,
		image: data.pageMetaTags.image ?? undefined
	}}
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(data.jsonLd)}</script>`}
</svelte:head>

{#if p.kind === 'freelancer'}
	<article class="fow-reveal mx-auto max-w-3xl space-y-5">
		<!-- Identity -->
		<header
			data-reveal-step="1"
			class="border-bone from-cream to-paper rounded-[var(--radius-card-lg)] border bg-gradient-to-br p-6 shadow-[var(--shadow-card)] sm:p-8"
		>
			<p class="text-ink-soft font-mono text-[11px] tracking-[0.18em] uppercase">
				Freelancer · Future of Work
			</p>
			<div class="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
				<UserAvatar src={p.avatar} size={96} alt={p.displayName} class="ring-bone ring-4" />
				<div class="min-w-0 space-y-2">
					<h1 class="fow-display text-ink text-4xl break-words sm:text-5xl">{p.displayName}</h1>
					<span class="bg-terracotta block h-1 w-12 rounded-full"></span>
					{#if p.headline}
						<p class="text-ink-soft text-base">{p.headline}</p>
					{/if}
					<div
						class="text-ink-soft flex flex-wrap items-center gap-x-2 gap-y-1 text-xs whitespace-nowrap"
					>
						{#if locationLabel(p.province, p.district)}
							<span class="inline-flex items-center gap-1">
								<MapPin class="h-3 w-3" />{locationLabel(p.province, p.district)}
							</span>
							<span aria-hidden="true">·</span>
						{/if}
						{#if p.experienceLevel}
							<span>{EXPERIENCE_LABEL[p.experienceLevel] ?? p.experienceLevel}</span>
							<span aria-hidden="true">·</span>
						{/if}
						<span>Since {memberSince(p.joinedAt)}</span>
					</div>
				</div>
			</div>

			<!-- Proof: the track record is the point of a public freelancer profile. -->
			<div class="border-bone mt-6 grid grid-cols-2 gap-4 border-t pt-5">
				<div>
					<p class="fow-display text-ink text-3xl tabular-nums sm:text-4xl">
						{formatMoneyCompact(p.totalEarnings, 'Le')}
					</p>
					<p class="text-ink-soft font-mono text-[11px] tracking-wide uppercase">Total earned</p>
				</div>
				<div>
					<p class="fow-display text-ink text-3xl tabular-nums sm:text-4xl">{p.wins.length}</p>
					<p class="text-ink-soft font-mono text-[11px] tracking-wide uppercase">
						{p.wins.length === 1 ? 'Bounty won' : 'Bounties won'}
					</p>
				</div>
			</div>

			{#if p.portfolio}
				<a
					href={p.portfolio}
					target="_blank"
					rel="noopener noreferrer nofollow"
					class="bg-ink text-cream hover:bg-ink/90 mt-6 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors"
				>
					View portfolio <ArrowUpRight class="h-4 w-4" />
				</a>
			{/if}
		</header>

		{#if p.bio}
			<Card data-reveal-step="2">
				<CardHeader><CardTitle>About</CardTitle></CardHeader>
				<CardContent>
					<p class="text-ink-soft text-sm leading-relaxed whitespace-pre-line">{p.bio}</p>
				</CardContent>
			</Card>
		{/if}

		{#if p.skills.length > 0}
			<Card data-reveal-step="3">
				<CardHeader><CardTitle>Skills</CardTitle></CardHeader>
				<CardContent>
					<ul class="flex flex-wrap gap-2">
						{#each p.skills as s (s.id)}
							<li
								class="border-bone bg-paper inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
							>
								<span class="text-ink text-xs font-medium">{s.name}</span>
								<span
									class="flex items-center gap-0.5"
									aria-label={`Level ${s.proficiencyLevel} of 5`}
								>
									{#each [1, 2, 3, 4, 5] as lvl (lvl)}
										<span
											class="h-1.5 w-1.5 rounded-full {lvl <= s.proficiencyLevel
												? 'bg-terracotta'
												: 'bg-bone'}"
										></span>
									{/each}
								</span>
							</li>
						{/each}
					</ul>
				</CardContent>
			</Card>
		{/if}

		{#if p.wins.length > 0}
			<Card data-reveal-step="4">
				<CardHeader><CardTitle>Winning work</CardTitle></CardHeader>
				<CardContent class="space-y-2">
					{#each p.wins as w (w.submissionId)}
						{@const place = placement(w.winnerPosition)}
						<a
							href={`/bounties/${w.bountySlug}`}
							class="border-bone hover:border-ink/30 hover:bg-paper/60 group flex items-center gap-3 rounded-[var(--radius-card)] border px-3 py-2.5 transition-colors"
						>
							<span
								class="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold {place.tone}"
							>
								<Trophy class="h-3 w-3" />{place.label}
							</span>
							<p
								class="text-ink group-hover:text-terracotta min-w-0 flex-1 truncate text-sm font-medium transition-colors"
							>
								{w.bountyTitle}
							</p>
							{#if w.prizeAmount != null}
								<span class="text-forest shrink-0 text-sm font-semibold tabular-nums">
									{formatMoney(w.prizeAmount, w.currency)}
								</span>
							{/if}
						</a>
					{/each}
				</CardContent>
			</Card>
		{/if}

		{#if isGuest}
			{@render guestCta()}
		{/if}
	</article>
{:else}
	<article class="fow-reveal mx-auto max-w-5xl space-y-6">
		<header
			data-reveal-step="1"
			class="border-bone from-cream to-paper rounded-[var(--radius-card-lg)] border bg-gradient-to-br p-6 shadow-[var(--shadow-card)] sm:p-8"
		>
			<p class="text-ink-soft font-mono text-[11px] tracking-[0.18em] uppercase">
				Company · Future of Work
			</p>
			<div class="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
				{#if p.logo}
					<img
						src={cloudinaryThumb(p.logo, 192)}
						alt={p.companyName}
						width={96}
						height={96}
						class="border-bone bg-cream h-24 w-24 shrink-0 rounded-2xl border object-contain p-2"
					/>
				{:else}
					<div
						class="border-bone bg-paper text-clay fow-display flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border text-4xl"
					>
						{p.companyName.charAt(0).toUpperCase()}
					</div>
				{/if}
				<div class="min-w-0 space-y-2">
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="fow-display text-ink text-4xl break-words sm:text-5xl">{p.companyName}</h1>
						{#if p.verified}
							<span
								class="bg-forest-soft text-forest inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
							>
								<BadgeCheck class="h-3.5 w-3.5" /> Verified
							</span>
						{/if}
					</div>
					<span class="bg-terracotta block h-1 w-12 rounded-full"></span>
					<div class="text-ink-soft flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
						{#if p.industry}<span>{p.industry}</span><span aria-hidden="true">·</span>{/if}
						<span>Since {memberSince(p.joinedAt)}</span>
					</div>
				</div>
			</div>

			{#if p.website}
				<a
					href={p.website}
					target="_blank"
					rel="noopener noreferrer nofollow"
					class="bg-ink text-cream hover:bg-ink/90 mt-6 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors"
				>
					Visit website <ArrowUpRight class="h-4 w-4" />
				</a>
			{/if}
		</header>

		{#if p.description}
			<Card data-reveal-step="2">
				<CardHeader><CardTitle>About</CardTitle></CardHeader>
				<CardContent>
					<p class="text-ink-soft text-sm leading-relaxed whitespace-pre-line">{p.description}</p>
				</CardContent>
			</Card>
		{/if}

		<section data-reveal-step="3" class="space-y-3">
			<div class="flex items-baseline justify-between">
				<h2 class="fow-display text-ink text-2xl">Open bounties</h2>
				{#if p.bounties.length > 0}
					<span class="text-ink-soft text-xs">{p.bounties.length} open</span>
				{/if}
			</div>
			{#if p.bounties.length > 0}
				<div class="grid gap-4 sm:grid-cols-2">
					{#each p.bounties as b (b.id)}
						<BountyCard bounty={b} />
					{/each}
				</div>
			{:else}
				<p
					class="border-bone text-ink-soft rounded-[var(--radius-card)] border border-dashed px-4 py-6 text-center text-sm"
				>
					No open bounties right now — check back soon.
				</p>
			{/if}
		</section>

		{#if p.projects.length > 0}
			<section data-reveal-step="4" class="space-y-3">
				<h2 class="fow-display text-ink text-2xl">Open projects</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					{#each p.projects as proj (proj.id)}
						<ProjectCard project={proj} />
					{/each}
				</div>
			</section>
		{/if}

		{#if isGuest}
			{@render guestCta()}
		{/if}
	</article>
{/if}

{#snippet guestCta()}
	<div
		class="border-bone bg-ink text-cream flex flex-col items-start gap-3 rounded-[var(--radius-card-lg)] border p-6 sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="space-y-1">
			<p class="fow-display text-2xl">Future of Work</p>
			<p class="text-cream/70 text-sm">
				Sierra Leone's bounty platform. Companies post paid work; freelancers compete to win.
			</p>
		</div>
		<a
			href="/bounties"
			class="bg-cream text-ink hover:bg-cream/90 inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
		>
			Explore bounties <ArrowUpRight class="h-4 w-4" />
		</a>
	</div>
{/snippet}
