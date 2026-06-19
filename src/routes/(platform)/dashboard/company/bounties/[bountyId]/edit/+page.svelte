<script lang="ts">
	import BountyForm from '$lib/components/bounties/BountyForm.svelte';

	let { data } = $props();
</script>

<div class="space-y-6 px-2 py-4 md:px-0">
	<header>
		<a href="/dashboard/company/bounties" class="text-ink-soft text-sm hover:underline">
			&larr; Your bounties
		</a>
		<h1 class="fow-display text-ink text-3xl">Edit bounty</h1>
		<p class="text-ink-soft text-sm">Update the brief, prizes, and timeline before you fund it.</p>
	</header>

	<BountyForm
		categories={data.categories}
		bountyId={data.bounty.id}
		initial={data.initial}
		isPinLocked={data.bounty.isPinLocked}
		submitLabel="Save changes"
		redirectTo="/dashboard/company/bounties"
	/>
</div>
