<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { MetaTags } from 'svelte-meta-tags';
	import { formatMoneyCompact } from '$lib/utils';
	import { Button, Input, Label, Select } from '$lib/components/ui';
	import BountyCard from '$lib/components/feed/BountyCard.svelte';

	let { data } = $props();

	// Filter state seeds once from server-rendered query params; user edits
	// drive subsequent updates via `goto`.
	let search = $state(untrack(() => data.filters.search));
	let type = $state(untrack(() => data.filters.type));
	let compensationType = $state(untrack(() => data.filters.compensationType));
	let minPrize = $state(untrack(() => data.filters.minPrize));
	let maxPrize = $state(untrack(() => data.filters.maxPrize));
	let beforeDeadline = $state(untrack(() => data.filters.beforeDeadline));
	let selectedSkillIds = $state<string[]>(untrack(() => [...data.filters.skillIds]));

	function applyFilters() {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		if (type) params.set('type', type);
		if (compensationType) params.set('compensationType', compensationType);
		if (minPrize) params.set('minPrize', String(minPrize));
		if (maxPrize) params.set('maxPrize', String(maxPrize));
		if (beforeDeadline) params.set('beforeDeadline', beforeDeadline);
		selectedSkillIds.forEach((id) => params.append('skillIds', id));
		goto(`/bounties?${params.toString()}`, { replaceState: false, keepFocus: true });
	}

	function clearFilters() {
		search = '';
		type = '';
		compensationType = '';
		minPrize = '';
		maxPrize = '';
		beforeDeadline = '';
		selectedSkillIds = [];
		goto('/bounties');
	}

	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	function onSearchInput() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(applyFilters, 300);
	}

	function toggleSkill(id: string) {
		selectedSkillIds = selectedSkillIds.includes(id)
			? selectedSkillIds.filter((x) => x !== id)
			: [...selectedSkillIds, id];
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
		class="border-bone space-y-4 rounded-[var(--radius-card)] border bg-white p-4 shadow-[var(--shadow-card)]"
	>
		<div class="space-y-1">
			<Label for="search">Search</Label>
			<Input id="search" bind:value={search} oninput={onSearchInput} placeholder="Keyword…" />
		</div>

		<div class="space-y-1">
			<Label for="type">Type</Label>
			<Select id="type" bind:value={type} onchange={applyFilters}>
				<option value="">All</option>
				<option value="BOUNTY">Bounty</option>
			</Select>
		</div>

		<div class="space-y-1">
			<Label for="compType">Compensation</Label>
			<Select id="compType" bind:value={compensationType} onchange={applyFilters}>
				<option value="">All</option>
				<option value="FIXED">Fixed prize</option>
				<option value="RANGE">Range</option>
				<option value="VARIABLE">Freelancer-proposed</option>
			</Select>
		</div>

		<div class="grid grid-cols-2 gap-2">
			<div class="space-y-1">
				<Label for="minP">Min (SLE)</Label>
				<Input id="minP" type="number" bind:value={minPrize} onchange={applyFilters} />
			</div>
			<div class="space-y-1">
				<Label for="maxP">Max (SLE)</Label>
				<Input id="maxP" type="number" bind:value={maxPrize} onchange={applyFilters} />
			</div>
		</div>

		<div class="space-y-1">
			<Label for="deadline">Closes before</Label>
			<Input id="deadline" type="date" bind:value={beforeDeadline} onchange={applyFilters} />
		</div>

		<div class="space-y-2">
			<p class="text-sm font-medium">Skills</p>
			<div class="max-h-64 space-y-2 overflow-y-auto pr-1">
				{#each data.categories as cat (cat.id)}
					<details>
						<summary class="text-ink-soft cursor-pointer text-sm">{cat.name}</summary>
						<ul class="mt-1 space-y-1 pl-3">
							{#each cat.skills as s (s.id)}
								<li class="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={selectedSkillIds.includes(s.id)}
										onchange={() => toggleSkill(s.id)}
										class="border-bone h-4 w-4 rounded"
									/>
									<span>{s.name}</span>
								</li>
							{/each}
						</ul>
					</details>
				{/each}
			</div>
			<Button variant="secondary" size="sm" onclick={applyFilters}>Apply skills</Button>
		</div>

		<Button variant="ghost" size="sm" onclick={clearFilters}>Clear filters</Button>
	</aside>

	<div class="space-y-4">
		<p class="text-ink-soft text-xs">{data.total} result{data.total === 1 ? '' : 's'}</p>

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
