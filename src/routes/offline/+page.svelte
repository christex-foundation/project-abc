<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
</script>

<MetaTags title="Offline" robots="noindex, nofollow" />

<section
	class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center"
>
	<h1 class="text-2xl font-semibold text-zinc-900">You're offline</h1>
	<p class="mt-3 text-sm text-zinc-600">
		Future of Work can't reach the network right now. Check your connection and try again — pages
		you've already opened will still work offline.
	</p>
	<button
		type="button"
		onclick={() => location.reload()}
		class="mt-6 inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
	>
		Retry
	</button>
</section>
