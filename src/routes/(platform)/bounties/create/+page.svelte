<script lang="ts">
	import BountyForm from '$lib/components/bounties/BountyForm.svelte';
	import { DRAFT_KEYS } from '$lib/constants/draft-keys';

	let { data } = $props();
</script>

<div class="space-y-6 px-2 py-4 md:px-0">
	<header class="space-y-1">
		<a
			href="/create"
			class="text-ink-soft hover:text-terracotta font-mono text-xs tracking-wide uppercase"
			>&larr; Choose type</a
		>
		<h1 class="fow-display text-ink text-3xl">Create a bounty</h1>
	</header>

	<BountyForm
		categories={data.categories}
		draftKey={DRAFT_KEYS.bountyCreate}
		submitLabel="Create draft"
	/>
</div>
