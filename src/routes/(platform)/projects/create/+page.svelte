<script lang="ts">
	import ProjectForm from '$lib/components/projects/ProjectForm.svelte';

	let { data } = $props();
</script>

<div class="space-y-6 px-2 py-4 md:px-0">
	<header>
		<a href="/create" class="text-sm text-zinc-500 hover:underline">&larr; Choose type</a>
		<h1 class="text-2xl font-semibold">Create a project</h1>
		<p class="text-sm text-zinc-500">
			Define the scope and milestone plan. Freelancers apply with a proposal; you award one, fund
			escrow, and release each milestone as it's approved.
		</p>
	</header>

	<ProjectForm
		categories={data.categories}
		draftKey="project-create-form"
		submitLabel="Create draft"
	/>
</div>
