<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { MetaTags } from 'svelte-meta-tags';
	import { formatMoneyCompact } from '$lib/utils';
	import { Badge, Button, Drawer } from '$lib/components/ui';
	import BountyCard from '$lib/components/feed/BountyCard.svelte';
	import BountyFilters, { type BountyFilterState } from '$lib/components/feed/BountyFilters.svelte';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';

	let { data } = $props();

	// Filter state seeds once from server-rendered query params; user edits
	// drive subsequent updates via `goto`.
	let filters = $state<BountyFilterState>({
		search: untrack(() => data.filters.search),
		type: untrack(() => data.filters.type),
		compensationType: untrack(() => data.filters.compensationType),
		minPrize: untrack(() => data.filters.minPrize),
		maxPrize: untrack(() => data.filters.maxPrize),
		beforeDeadline: untrack(() => data.filters.beforeDeadline),
		skillIds: untrack(() => [...data.filters.skillIds])
	});

	let filtersOpen = $state(false);

	let activeCount = $derived(
		(filters.search ? 1 : 0) +
			(filters.type ? 1 : 0) +
			(filters.compensationType ? 1 : 0) +
			(filters.minPrize ? 1 : 0) +
			(filters.maxPrize ? 1 : 0) +
			(filters.beforeDeadline ? 1 : 0) +
			filters.skillIds.length
	);

	function applyFilters() {
		const params = new URLSearchParams();
		if (filters.search) params.set('search', filters.search);
		if (filters.type) params.set('type', filters.type);
		if (filters.compensationType) params.set('compensationType', filters.compensationType);
		if (filters.minPrize) params.set('minPrize', String(filters.minPrize));
		if (filters.maxPrize) params.set('maxPrize', String(filters.maxPrize));
		if (filters.beforeDeadline) params.set('beforeDeadline', filters.beforeDeadline);
		filters.skillIds.forEach((id) => params.append('skillIds', id));
		goto(`/bounties?${params.toString()}`, { replaceState: false, keepFocus: true });
	}

	function clearFilters() {
		filters = {
			search: '',
			type: '',
			compensationType: '',
			minPrize: '',
			maxPrize: '',
			beforeDeadline: '',
			skillIds: []
		};
		filtersOpen = false;
		goto('/bounties');
	}

	function showResults() {
		applyFilters();
		filtersOpen = false;
	}
</script>

<MetaTags
	title="Browse bounties"
	description="Paid bounties open to Sierra Leonean freelancers."
	canonical={`${page.url.origin}/bounties`}
	robots={data.pageMetaTags?.robots}
/>

<header class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<p
			class="bg-terracotta-soft text-clay inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
		>
			<span class="bg-terracotta h-1.5 w-1.5 rounded-full"></span>
			Win-only
		</p>
		<h1 class="fow-display text-ink mt-3 text-4xl">Bounties</h1>
		<p class="text-ink-soft mt-1 text-sm">
			Submit a link, compete for the prize. Winners get paid via mobile money.
		</p>
	</div>

	<div
		class="border-bone bg-paper rounded-[var(--radius-card)] border px-5 py-4 text-right shadow-[var(--shadow-card)]"
	>
		<p
			class="text-ink-soft flex items-center justify-end gap-1.5 font-mono text-[11px] font-medium tracking-wide uppercase"
		>
			<span class="fow-pulse bg-terracotta inline-block h-1.5 w-1.5 rounded-full"></span>
			Up for grabs
		</p>
		<p class="fow-display text-ink mt-1.5 text-4xl tabular-nums">
			{formatMoneyCompact(data.pot.valueMinor)}
		</p>
		<p class="text-ink-soft mt-0.5 text-xs">
			across {data.pot.count} open {data.pot.count === 1 ? 'bounty' : 'bounties'}
		</p>
	</div>
</header>

<section class="grid gap-5 md:grid-cols-[280px_1fr]">
	<aside
		class="border-bone hidden space-y-4 rounded-[var(--radius-card)] border bg-white p-4 shadow-[var(--shadow-card)] md:block"
	>
		<BountyFilters bind:filters categories={data.categories} instant onApply={applyFilters} />
		<Button variant="ghost" size="sm" onclick={clearFilters}>Clear filters</Button>
	</aside>

	<div class="space-y-4">
		<!-- Mobile filter trigger: sidebar is hidden < md, so filters live in a drawer. -->
		<div class="flex items-center justify-between gap-3 md:hidden">
			<Button variant="outline" size="sm" onclick={() => (filtersOpen = true)}>
				<SlidersHorizontal class="h-4 w-4" />
				Filters
				{#if activeCount}
					<Badge variant="default" class="ml-0.5 px-1.5 py-0">{activeCount}</Badge>
				{/if}
			</Button>
			<p class="text-ink-soft text-xs">{data.total} result{data.total === 1 ? '' : 's'}</p>
		</div>

		<p class="text-ink-soft hidden text-xs md:block">
			{data.total} result{data.total === 1 ? '' : 's'}
		</p>

		{#if data.items.length === 0}
			<div
				class="border-bone bg-paper/50 rounded-[var(--radius-card-lg)] border border-dashed px-6 py-12 text-center"
			>
				<p class="fow-display text-ink-soft text-3xl">No bounties match these filters</p>
				<p class="text-ink-soft mt-2 text-sm">Try clearing a filter or check back soon.</p>
			</div>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{#each data.items as b (b.id)}
					<BountyCard bounty={b} />
				{/each}
			</div>
		{/if}
	</div>
</section>

<!-- Mobile filter drawer: edits stage locally and apply on "Show results". -->
<Drawer bind:open={filtersOpen} onClose={() => (filtersOpen = false)} title="Filters" width="sm">
	<BountyFilters bind:filters categories={data.categories} onApply={showResults} />

	{#snippet footer()}
		<div class="flex items-center justify-between gap-3">
			<Button variant="ghost" size="sm" onclick={clearFilters}>Clear all</Button>
			<Button variant="default" size="default" class="flex-1" onclick={showResults}>
				Show results
			</Button>
		</div>
	{/snippet}
</Drawer>
