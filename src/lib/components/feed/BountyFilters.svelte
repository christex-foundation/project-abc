<script lang="ts" module>
	export type BountyFilterState = {
		search: string;
		type: string;
		compensationType: string;
		minPrize: string;
		maxPrize: string;
		beforeDeadline: string;
		skillIds: string[];
	};

	export type SkillCategory = {
		id: string;
		name: string;
		skills: { id: string; name: string }[];
	};
</script>

<script lang="ts">
	import { Button, Input, Label, Select } from '$lib/components/ui';

	type Props = {
		filters: BountyFilterState;
		categories: SkillCategory[];
		// When true, field changes apply immediately (desktop sidebar). When false,
		// fields only mutate state and the parent applies on demand (mobile drawer),
		// avoiding a results reload behind an open drawer.
		instant?: boolean;
		onApply: () => void;
	};

	let { filters = $bindable(), categories, instant = false, onApply }: Props = $props();

	const onChange = () => {
		if (instant) onApply();
	};

	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	function onSearchInput() {
		if (!instant) return;
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(onApply, 300);
	}

	function toggleSkill(id: string) {
		filters.skillIds = filters.skillIds.includes(id)
			? filters.skillIds.filter((x) => x !== id)
			: [...filters.skillIds, id];
	}
</script>

<div class="space-y-4">
	<div class="space-y-1">
		<Label for="search">Search</Label>
		<Input id="search" bind:value={filters.search} oninput={onSearchInput} placeholder="Keyword…" />
	</div>

	<div class="space-y-1">
		<Label for="type">Type</Label>
		<Select id="type" bind:value={filters.type} onchange={onChange}>
			<option value="">All</option>
			<option value="BOUNTY">Bounty</option>
		</Select>
	</div>

	<div class="space-y-1">
		<Label for="compType">Compensation</Label>
		<Select id="compType" bind:value={filters.compensationType} onchange={onChange}>
			<option value="">All</option>
			<option value="FIXED">Fixed prize</option>
			<option value="RANGE">Range</option>
			<option value="VARIABLE">Freelancer-proposed</option>
		</Select>
	</div>

	<div class="grid grid-cols-2 gap-2">
		<div class="space-y-1">
			<Label for="minP">Min (SLE)</Label>
			<Input id="minP" type="number" bind:value={filters.minPrize} onchange={onChange} />
		</div>
		<div class="space-y-1">
			<Label for="maxP">Max (SLE)</Label>
			<Input id="maxP" type="number" bind:value={filters.maxPrize} onchange={onChange} />
		</div>
	</div>

	<div class="space-y-1">
		<Label for="deadline">Closes before</Label>
		<Input id="deadline" type="date" bind:value={filters.beforeDeadline} onchange={onChange} />
	</div>

	<div class="space-y-2">
		<p class="text-sm font-medium">Skills</p>
		<div class="max-h-64 space-y-2 overflow-y-auto pr-1">
			{#each categories as cat (cat.id)}
				<details>
					<summary class="text-ink-soft cursor-pointer text-sm">{cat.name}</summary>
					<ul class="mt-1 space-y-1 pl-3">
						{#each cat.skills as s (s.id)}
							<li class="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={filters.skillIds.includes(s.id)}
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
		{#if instant}
			<Button variant="secondary" size="sm" onclick={onApply}>Apply skills</Button>
		{/if}
	</div>
</div>
