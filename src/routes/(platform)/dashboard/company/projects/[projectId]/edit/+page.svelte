<script lang="ts">
	import ProjectForm from '$lib/components/projects/ProjectForm.svelte';

	let { data } = $props();
</script>

<div class="space-y-6 px-2 py-4 md:px-0">
	<header>
		<a href="/dashboard/company/projects" class="text-sm text-zinc-500 hover:underline">
			&larr; Your projects
		</a>
		<h1 class="text-2xl font-semibold">Edit project</h1>
		<p class="text-sm text-zinc-500">
			{#if data.project.status === 'AWARDED'}
				Adjust the scope and milestone plan before you fund escrow.
			{:else}
				Update the scope and milestone plan.
			{/if}
		</p>
	</header>

	<ProjectForm
		categories={data.categories}
		projectId={data.project.id}
		initial={data.initial}
		submitLabel="Save changes"
		redirectTo={data.project.status === 'AWARDED'
			? `/dashboard/company/projects/${data.project.id}/fund`
			: '/dashboard/company/projects'}
	/>
</div>
