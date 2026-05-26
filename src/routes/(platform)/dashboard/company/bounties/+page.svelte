<script lang="ts">
	import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '$lib/components/ui';

	let { data } = $props();

	const statusOrder = ['DRAFT', 'FUNDED', 'ACTIVE', 'JUDGING', 'COMPLETED', 'CANCELLED'] as const;
	type Status = (typeof statusOrder)[number];

	const grouped = $derived.by(() => {
		const out: Record<Status, typeof data.bounties> = {
			DRAFT: [],
			FUNDED: [],
			ACTIVE: [],
			JUDGING: [],
			COMPLETED: [],
			CANCELLED: []
		};
		for (const b of data.bounties) (out[b.status as Status] ??= []).push(b);
		return out;
	});

	function badgeVariant(s: Status) {
		if (s === 'DRAFT') return 'secondary' as const;
		if (s === 'ACTIVE') return 'success' as const;
		if (s === 'CANCELLED') return 'destructive' as const;
		return 'outline' as const;
	}

	function formatMoney(minor: number, currency: string) {
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}
</script>

<div class="space-y-6">
	<header class="flex items-center justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold">Your bounties</h1>
			<p class="text-sm text-zinc-500">Drafts, funded escrows, active campaigns.</p>
		</div>
		<Button href="/bounties/create">+ Create</Button>
	</header>

	{#if data.bounties.length === 0}
		<Card>
			<CardContent class="py-12 text-center text-zinc-500">
				No bounties yet. <a href="/bounties/create" class="underline">Create your first one</a>.
			</CardContent>
		</Card>
	{:else}
		{#each statusOrder as s (s)}
			{#if grouped[s].length > 0}
				<section class="space-y-2">
					<h2 class="text-sm font-semibold text-zinc-500 uppercase">{s}</h2>
					<div class="grid gap-3 sm:grid-cols-2">
						{#each grouped[s] as b (b.id)}
							<Card>
								<CardHeader>
									<div class="flex items-center justify-between">
										<Badge variant={badgeVariant(s)}>{s}</Badge>
										<Badge variant="outline">{b.type}</Badge>
									</div>
									<CardTitle class="line-clamp-2 text-base">{b.title}</CardTitle>
								</CardHeader>
								<CardContent class="flex items-center justify-between">
									<span class="text-sm font-medium"
										>{formatMoney(b.totalPrizePool, b.currency)}</span
									>
									{#if s === 'DRAFT'}
										<Button size="sm" variant="outline" href={`/bounties/${b.slug}`}>Preview</Button
										>
									{:else}
										<Button size="sm" variant="outline" href={`/bounties/${b.slug}`}>View</Button>
									{/if}
								</CardContent>
							</Card>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	{/if}
</div>
