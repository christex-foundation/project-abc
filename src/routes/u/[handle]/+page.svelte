<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { page } from '$app/state';
	import { Card, CardContent, CardHeader, CardTitle, StatCard } from '$lib/components/ui';
	import UserAvatar from '$lib/components/shared/UserAvatar.svelte';
	import BountyCard from '$lib/components/feed/BountyCard.svelte';
	import ProjectCard from '$lib/components/feed/ProjectCard.svelte';
	import { cloudinaryThumb, formatMoney, formatMoneyCompact } from '$lib/utils';
	import { PROVINCE_LABEL, DISTRICT_LABEL, type Province, type District } from '$lib/constants/geo';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import Trophy from '@lucide/svelte/icons/trophy';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	let { data } = $props();
	const p = $derived(data.profile);

	const canonical = $derived(`${page.url.origin}/u/${p.handle}`);

	function memberSince(d: Date | string): string {
		return new Date(d).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
	}

	function locationLabel(province: string | null, district: string | null): string | null {
		if (!province) return null;
		const prov = PROVINCE_LABEL[province as Province] ?? province;
		const dist = district ? (DISTRICT_LABEL[district as District] ?? district) : null;
		return dist ? `${dist}, ${prov}` : prov;
	}

	function positionLabel(pos: number | null): string {
		if (pos === 99) return 'Bonus';
		if (pos === 1) return '1st place';
		if (pos === 2) return '2nd place';
		if (pos === 3) return '3rd place';
		if (pos) return `${pos}th place`;
		return 'Winner';
	}
</script>

<MetaTags
	title={data.pageMetaTags.title}
	description={data.pageMetaTags.description}
	{canonical}
	openGraph={{
		type: 'profile',
		title: data.pageMetaTags.title,
		description: data.pageMetaTags.description,
		images: data.pageMetaTags.image
			? [{ url: data.pageMetaTags.image, alt: data.pageMetaTags.title }]
			: undefined
	}}
/>

{#if p.kind === 'freelancer'}
	<article class="mx-auto max-w-3xl space-y-6">
		<header class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
			<UserAvatar src={p.avatar} size={88} alt={p.displayName} />
			<div class="min-w-0 space-y-1">
				<h1 class="fow-display text-ink text-3xl break-words">{p.displayName}</h1>
				{#if p.headline}
					<p class="text-ink-soft text-base">{p.headline}</p>
				{/if}
				<div class="text-ink-soft flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
					{#if locationLabel(p.province, p.district)}
						<span>{locationLabel(p.province, p.district)}</span>
					{/if}
					{#if p.experienceLevel}
						<span class="bg-paper rounded-full px-2 py-0.5">{p.experienceLevel}</span>
					{/if}
					<span>Member since {memberSince(p.joinedAt)}</span>
				</div>
			</div>
		</header>

		<div class="grid grid-cols-2 gap-3">
			<StatCard
				label="Total earned"
				value={formatMoneyCompact(p.totalEarnings, 'Le')}
				tone="success"
			/>
			<StatCard label="Bounties won" value={p.wins.length} icon={Trophy} tone="accent" />
		</div>

		{#if p.bio}
			<Card>
				<CardHeader><CardTitle>About</CardTitle></CardHeader>
				<CardContent>
					<p class="text-ink-soft text-sm whitespace-pre-line">{p.bio}</p>
				</CardContent>
			</Card>
		{/if}

		{#if p.portfolio}
			<a
				href={p.portfolio}
				target="_blank"
				rel="noopener noreferrer nofollow"
				class="border-bone bg-cream text-ink hover:border-terracotta/40 inline-flex items-center gap-2 rounded-[var(--radius-card)] border px-4 py-2 text-sm font-medium transition-colors"
			>
				<ExternalLink class="h-4 w-4" /> View portfolio
			</a>
		{/if}

		{#if p.skills.length > 0}
			<Card>
				<CardHeader><CardTitle>Skills</CardTitle></CardHeader>
				<CardContent>
					<div class="flex flex-wrap gap-2">
						{#each p.skills as s (s.id)}
							<span
								class="border-bone bg-paper text-ink-soft inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
							>
								{s.name}
								<span class="text-ink/40">·</span>
								<span class="text-ink tabular-nums">{s.proficiencyLevel}/5</span>
							</span>
						{/each}
					</div>
				</CardContent>
			</Card>
		{/if}

		{#if p.wins.length > 0}
			<Card>
				<CardHeader><CardTitle>Winning work</CardTitle></CardHeader>
				<CardContent class="space-y-2">
					{#each p.wins as w (w.submissionId)}
						<a
							href={`/bounties/${w.bountySlug}`}
							class="border-bone hover:border-terracotta/40 flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors"
						>
							<div class="min-w-0">
								<p class="text-ink truncate text-sm font-medium">{w.bountyTitle}</p>
								<p class="text-ink-soft text-xs">{positionLabel(w.winnerPosition)}</p>
							</div>
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
	</article>
{:else}
	<article class="mx-auto max-w-5xl space-y-6">
		<header class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
			{#if p.logo}
				<img
					src={cloudinaryThumb(p.logo, 176)}
					alt={p.companyName}
					width={88}
					height={88}
					class="border-bone bg-cream h-22 w-22 shrink-0 rounded-2xl border object-contain p-2"
				/>
			{:else}
				<div
					class="border-bone bg-paper text-ink-soft flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl border text-3xl font-semibold"
				>
					{p.companyName.charAt(0).toUpperCase()}
				</div>
			{/if}
			<div class="min-w-0 space-y-1">
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="fow-display text-ink text-3xl break-words">{p.companyName}</h1>
					{#if p.verified}
						<span class="text-forest inline-flex items-center gap-1 text-sm font-medium">
							<BadgeCheck class="h-4 w-4" /> Verified
						</span>
					{/if}
				</div>
				<div class="text-ink-soft flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
					{#if p.industry}<span>{p.industry}</span>{/if}
					{#if p.website}
						<a
							href={p.website}
							target="_blank"
							rel="noopener noreferrer nofollow"
							class="hover:text-terracotta inline-flex items-center gap-1 underline"
						>
							<ExternalLink class="h-3 w-3" /> Website
						</a>
					{/if}
					<span>Member since {memberSince(p.joinedAt)}</span>
				</div>
			</div>
		</header>

		{#if p.description}
			<Card>
				<CardHeader><CardTitle>About</CardTitle></CardHeader>
				<CardContent>
					<p class="text-ink-soft text-sm whitespace-pre-line">{p.description}</p>
				</CardContent>
			</Card>
		{/if}

		<section class="space-y-3">
			<h2 class="fow-display text-ink text-xl">Open bounties</h2>
			{#if p.bounties.length > 0}
				<div class="grid gap-4 sm:grid-cols-2">
					{#each p.bounties as b (b.id)}
						<BountyCard bounty={b} />
					{/each}
				</div>
			{:else}
				<p class="text-ink-soft text-sm">No open bounties right now.</p>
			{/if}
		</section>

		{#if p.projects.length > 0}
			<section class="space-y-3">
				<h2 class="fow-display text-ink text-xl">Open projects</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					{#each p.projects as proj (proj.id)}
						<ProjectCard project={proj} />
					{/each}
				</div>
			</section>
		{/if}
	</article>
{/if}
