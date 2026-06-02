<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { page } from '$app/state';
	import RichTextView from '$lib/components/editor/RichTextView.svelte';
	import CoachPanel from '$lib/components/ai/CoachPanel.svelte';
	import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '$lib/components/ui';

	let { data } = $props();
	const p = $derived(data.project);

	function formatMoney(minor: number, currency: string) {
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	const STATUS_LABEL: Record<string, string> = {
		OPEN: 'Accepting proposals',
		AWARDED: 'Awarded',
		ACTIVE: 'In progress',
		COMPLETED: 'Completed',
		CANCELLED: 'Cancelled',
		DRAFT: 'Draft'
	};

	const isFreelancer = $derived(page.data.user?.role === 'FREELANCER');
	const isOwner = $derived(data.isOwner);
	const proposalCount = $derived(data.proposalCount);
</script>

<MetaTags
	title={p.title}
	description={data.pageMetaTags.description}
	canonical={`${page.url.origin}/projects/${p.slug}`}
	openGraph={{
		type: 'website',
		title: p.title,
		description: data.pageMetaTags.description,
		images: p.company?.logo ? [{ url: p.company.logo, alt: p.company.companyName }] : undefined
	}}
/>

<article class="space-y-6">
	<header class="space-y-3">
		<div class="flex items-center gap-2">
			<Badge variant="secondary">Project</Badge>
			<Badge variant="outline">{STATUS_LABEL[p.status] ?? p.status}</Badge>
		</div>
		<h1 class="text-3xl font-semibold tracking-tight">{p.title}</h1>
		<div class="flex items-center gap-3 text-sm text-zinc-600">
			{#if p.company?.logo}
				<img src={p.company.logo} alt="" class="h-8 w-8 rounded-full" />
			{/if}
			<span>{p.company?.companyName ?? p.companyNameSnapshot ?? 'Anonymous sponsor'}</span>
			{#if p.company?.website}
				<a href={p.company.website} target="_blank" rel="noopener noreferrer" class="underline"
					>website</a
				>
			{/if}
		</div>
	</header>

	<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
		<div class="space-y-6">
			<Card>
				<CardHeader><CardTitle>Overview</CardTitle></CardHeader>
				<CardContent><RichTextView html={p.description} /></CardContent>
			</Card>

			{#if p.requirements}
				<Card>
					<CardHeader><CardTitle>Requirements</CardTitle></CardHeader>
					<CardContent><RichTextView html={p.requirements} /></CardContent>
				</Card>
			{/if}

			{#if p.deliverables}
				<Card>
					<CardHeader><CardTitle>Deliverables</CardTitle></CardHeader>
					<CardContent><RichTextView html={p.deliverables} /></CardContent>
				</Card>
			{/if}

			<Card>
				<CardHeader><CardTitle>Milestones</CardTitle></CardHeader>
				<CardContent>
					<ul class="divide-y text-sm">
						{#each p.milestones as m (m.id)}
							<li class="flex items-start justify-between gap-3 py-2">
								<div>
									<div class="font-medium">{m.position}. {m.title}</div>
									{#if m.dueInDays}<div class="text-xs text-zinc-500">~{m.dueInDays} days</div>{/if}
								</div>
								<span class="font-medium tabular-nums">{formatMoney(m.amount, p.currency)}</span>
							</li>
						{/each}
					</ul>
				</CardContent>
			</Card>

			<Card>
				<CardContent class="space-y-2 py-4 text-sm text-zinc-600">
					<p>
						This is a <strong>project</strong>: the company has set the milestone plan above. You
						apply with a cover letter; the company picks one contractor, funds escrow, and releases
						each milestone payment when it's approved.
					</p>
				</CardContent>
			</Card>
		</div>

		<aside class="space-y-4">
			<Card>
				<CardHeader><CardTitle>Budget</CardTitle></CardHeader>
				<CardContent class="space-y-2 text-sm">
					<p class="text-xl font-semibold">{formatMoney(p.budgetCap, p.currency)}</p>
					<p class="text-zinc-500">Total across all milestones, held in escrow.</p>
					{#if p.timeToComplete}
						<div class="pt-2">
							<div class="text-xs text-zinc-500">Expected duration</div>
							<div class="font-medium">{p.timeToComplete}</div>
						</div>
					{/if}
				</CardContent>
			</Card>

			{#if p.skills.length > 0}
				<Card>
					<CardHeader><CardTitle>Skills</CardTitle></CardHeader>
					<CardContent>
						<div class="flex flex-wrap gap-1">
							{#each p.skills as s (s.id)}
								<Badge variant={s.isRequired ? 'default' : 'outline'}>
									{s.skill.name}{s.isRequired ? ' *' : ''}
								</Badge>
							{/each}
						</div>
						<p class="mt-2 text-xs text-zinc-500">* = required</p>
					</CardContent>
				</Card>
			{/if}

			{#if isFreelancer}
				<CoachPanel kind="PROJECT" projectId={p.id} slug={p.slug} aiEnabled={data.aiEnabled} />
			{/if}

			{#if isOwner && (p.status === 'OPEN' || p.status === 'AWARDED')}
				<Button class="w-full" href={`/dashboard/company/projects/${p.id}/proposals`}>
					View proposals ({proposalCount})
				</Button>
			{:else if isOwner && (p.status === 'ACTIVE' || p.status === 'COMPLETED')}
				<Button class="w-full" href={`/projects/${p.slug}/workspace`}>Open workspace</Button>
			{:else if p.status === 'OPEN' && isFreelancer}
				<Button class="w-full" href={`/projects/${p.slug}/apply`}>Apply with a proposal</Button>
			{:else if p.status === 'OPEN' && !page.data.user}
				<Button
					class="w-full"
					href={`/login?next=${encodeURIComponent(`/projects/${p.slug}/apply`)}`}
				>
					Sign in to apply
				</Button>
			{:else if p.status === 'OPEN'}
				<Button class="w-full" disabled>Open to freelancers</Button>
			{:else}
				<Button class="w-full" disabled>Not accepting proposals</Button>
			{/if}
		</aside>
	</div>
</article>
