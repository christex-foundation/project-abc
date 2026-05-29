<script lang="ts">
	import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '$lib/components/ui';

	let { data } = $props();

	function formatMoney(minor: number, currency: string) {
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	function statusVariant(s: string) {
		if (s === 'AWARDED') return 'success' as const;
		if (s === 'REJECTED' || s === 'WITHDRAWN') return 'secondary' as const;
		return 'outline' as const;
	}
</script>

<div class="space-y-8">
	<header>
		<h1 class="text-2xl font-semibold">Your proposals</h1>
		<p class="text-sm text-zinc-500">Applications you've sent and projects you've been awarded.</p>
	</header>

	{#if data.contractedProjects.length > 0}
		<section class="space-y-2">
			<h2 class="text-sm font-semibold text-zinc-500 uppercase">Active engagements</h2>
			<div class="grid gap-3 sm:grid-cols-2">
				{#each data.contractedProjects as p (p.id)}
					<Card>
						<CardHeader>
							<div class="flex items-center justify-between">
								<Badge variant={p.status === 'ACTIVE' ? 'success' : 'outline'}>{p.status}</Badge>
								<span class="text-xs text-zinc-500">{formatMoney(p.budgetCap, p.currency)}</span>
							</div>
							<CardTitle class="line-clamp-2 text-base">{p.title}</CardTitle>
						</CardHeader>
						<CardContent>
							{#if p.status === 'ACTIVE' || p.status === 'COMPLETED'}
								<Button size="sm" variant="outline" href={`/projects/${p.slug}/workspace`}>
									Open workspace
								</Button>
							{:else}
								<Button size="sm" variant="outline" href={`/projects/${p.slug}`}>View</Button>
							{/if}
						</CardContent>
					</Card>
				{/each}
			</div>
		</section>
	{/if}

	<section class="space-y-2">
		<h2 class="text-sm font-semibold text-zinc-500 uppercase">Proposals</h2>
		{#if data.proposals.length === 0}
			<Card>
				<CardContent class="py-12 text-center text-zinc-500">
					No proposals yet. <a href="/projects" class="underline">Browse projects</a>.
				</CardContent>
			</Card>
		{:else}
			<div class="space-y-3">
				{#each data.proposals as p (p.id)}
					<Card>
						<CardContent class="flex flex-wrap items-center justify-between gap-3 py-4">
							<div>
								<a href={`/projects/${p.project.slug}`} class="font-medium hover:underline">
									{p.project.title}
								</a>
								<p class="text-xs text-zinc-500">
									Budget {formatMoney(p.project.budgetCap, p.project.currency)}
									{#if p.proposedTimeline}· {p.proposedTimeline}{/if}
								</p>
							</div>
							<div class="flex items-center gap-3">
								<Badge variant={statusVariant(p.status)}>{p.status}</Badge>
								{#if p.status === 'AWARDED'}
									<Button
										size="sm"
										variant="outline"
										href={`/projects/${p.project.slug}/workspace`}
									>
										Workspace
									</Button>
								{/if}
							</div>
						</CardContent>
					</Card>
				{/each}
			</div>
		{/if}
	</section>
</div>
