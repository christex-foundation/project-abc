<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { MetaTags } from 'svelte-meta-tags';
	import { Input, Label, Select, Button } from '$lib/components/ui';
	import BountyCard from '$lib/components/feed/BountyCard.svelte';

	let { data } = $props();

	let search = $state(untrack(() => data.filters.search));
	let compensationType = $state(untrack(() => data.filters.compensationType));
	let minPrize = $state(untrack(() => data.filters.minPrize));
	let maxPrize = $state(untrack(() => data.filters.maxPrize));
	let beforeDeadline = $state(untrack(() => data.filters.beforeDeadline));
	let selectedSkillIds = $state<string[]>(untrack(() => [...data.filters.skillIds]));

	function applyFilters() {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		if (compensationType) params.set('compensationType', compensationType);
		if (minPrize) params.set('minPrize', String(minPrize));
		if (maxPrize) params.set('maxPrize', String(maxPrize));
		if (beforeDeadline) params.set('beforeDeadline', beforeDeadline);
		selectedSkillIds.forEach((id) => params.append('skillIds', id));
		goto(`/projects?${params.toString()}`, { replaceState: false, keepFocus: true });
	}

	function clearFilters() {
		search = '';
		compensationType = '';
		minPrize = '';
		maxPrize = '';
		beforeDeadline = '';
		selectedSkillIds = [];
		goto('/projects');
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
	title="Browse projects"
	description="Longer-form projects open to Sierra Leonean freelancers."
	canonical={`${page.url.origin}/projects`}
	robots={data.pageMetaTags?.robots}
/>

<header class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<p
			class="bg-forest-soft text-forest inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
		>
			<span class="bg-forest h-1.5 w-1.5 rounded-full"></span>
			Hire & deliver
		</p>
		<h1
			class="font-display text-ink mt-3 text-4xl font-semibold tracking-tight"
			style="font-variation-settings: 'opsz' 144, 'wght' 600;"
		>
			Projects
		</h1>
		<p class="text-ink-soft mt-1 text-sm">
			Longer engagements with deliverables, timelines, and milestone payouts.
		</p>
	</div>
	<a
		href="/bounties"
		class="border-bone bg-cream text-ink-soft hover:border-ink hover:text-ink rounded-full border px-4 py-2 text-sm font-medium transition-colors"
	>
		Switch to bounties →
	</a>
</header>

<section class="grid gap-5 md:grid-cols-[280px_1fr]">
	<aside class="border-bone bg-cream space-y-4 rounded-2xl border p-4">
		<div class="space-y-1">
			<Label for="search">Search</Label>
			<Input id="search" bind:value={search} oninput={onSearchInput} placeholder="Keyword…" />
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
			<div class="border-bone bg-paper/50 rounded-2xl border border-dashed px-6 py-12 text-center">
				<p
					class="font-display text-ink-soft text-2xl"
					style="font-variation-settings: 'opsz' 144, 'wght' 500;"
				>
					No projects match these filters
				</p>
				<p class="text-ink-soft mt-2 text-sm">Try clearing some filters or check back soon.</p>
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
