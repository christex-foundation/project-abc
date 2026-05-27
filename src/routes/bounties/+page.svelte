<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { MetaTags } from 'svelte-meta-tags';
	import {
		Button,
		Input,
		Label,
		Select,
		Card,
		CardHeader,
		CardTitle,
		CardContent,
		Badge
	} from '$lib/components/ui';

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

	function formatMoney(minor: number, currency: string) {
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	function deadlineLabel(d: string | Date) {
		const date = new Date(d);
		const ms = date.getTime() - Date.now();
		if (ms <= 0) return 'Closed';
		const days = Math.ceil(ms / 86_400_000);
		return days <= 1 ? 'Closing today' : `${days} days left`;
	}
</script>

<MetaTags
	title="Browse bounties"
	description="Paid bounties and projects open to Sierra Leonean freelancers."
	canonical={`${page.url.origin}/bounties`}
	robots={data.pageMetaTags?.robots}
/>

<h1 class="text-2xl font-semibold">Bounties</h1>
<p class="mt-1 text-sm text-zinc-500">Find paid bounties and projects open to apply.</p>

<section class="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
	<aside class="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
		<div class="space-y-1">
			<Label for="search">Search</Label>
			<Input id="search" bind:value={search} oninput={onSearchInput} placeholder="Keyword…" />
		</div>

		<div class="space-y-1">
			<Label for="type">Type</Label>
			<Select id="type" bind:value={type} onchange={applyFilters}>
				<option value="">All</option>
				<option value="BOUNTY">Bounty</option>
				<option value="PROJECT">Project</option>
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
						<summary class="cursor-pointer text-sm text-zinc-700">{cat.name}</summary>
						<ul class="mt-1 space-y-1 pl-3">
							{#each cat.skills as s (s.id)}
								<li class="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={selectedSkillIds.includes(s.id)}
										onchange={() => toggleSkill(s.id)}
										class="h-4 w-4 rounded border-zinc-300"
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
		{#if data.items.length === 0}
			<Card>
				<CardContent class="py-12 text-center text-zinc-500">
					No bounties match these filters yet.
				</CardContent>
			</Card>
		{:else}
			<p class="text-xs text-zinc-500">{data.total} result{data.total === 1 ? '' : 's'}</p>
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each data.items as b (b.id)}
					<a href={`/bounties/${b.slug}`} class="block">
						<Card class="h-full transition hover:border-zinc-400">
							<CardHeader>
								<div class="flex items-center justify-between gap-2">
									<Badge variant={b.type === 'PROJECT' ? 'secondary' : 'default'}>
										{b.type}
									</Badge>
									<span class="text-xs text-zinc-500">{deadlineLabel(b.submissionDeadline)}</span>
								</div>
								<CardTitle class="line-clamp-2 text-base">{b.title}</CardTitle>
							</CardHeader>
							<CardContent>
								<p class="text-sm font-medium text-zinc-900">
									{formatMoney(b.totalPrizePool, b.currency)}
									{#if b.compensationType !== 'FIXED'}
										<span class="ml-1 text-xs font-normal text-zinc-500"
											>({b.compensationType})</span
										>
									{/if}
								</p>
								<p class="mt-1 text-xs text-zinc-500">
									{b.company?.companyName ?? b.companyNameSnapshot ?? 'Anonymous sponsor'}
								</p>
								{#if b.skills.length > 0}
									<div class="mt-3 flex flex-wrap gap-1">
										{#each b.skills.slice(0, 3) as s (s.id)}
											<Badge variant="outline">{s.skill.name}</Badge>
										{/each}
										{#if b.skills.length > 3}
											<span class="text-xs text-zinc-500">+{b.skills.length - 3}</span>
										{/if}
									</div>
								{/if}
							</CardContent>
						</Card>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</section>
