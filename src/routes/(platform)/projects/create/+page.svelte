<script lang="ts">
	import ProjectForm from '$lib/components/projects/ProjectForm.svelte';
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
		<h1 class="fow-display text-ink text-3xl">Create a project</h1>
		<p class="text-ink-soft text-sm">
			Define the scope and milestone plan. Freelancers apply with a proposal. You award one, fund
			escrow, and release each milestone as it's approved.
		</p>
	</header>

	<ProjectForm
		categories={data.categories}
		draftKey={DRAFT_KEYS.projectCreate}
		submitLabel="Create draft"
	/>
</div>
