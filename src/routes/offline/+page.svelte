<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
</script>

<MetaTags title="Offline" robots="noindex, nofollow" />

<section
	class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center"
>
	<h1 class="fow-display text-ink text-4xl">You're offline</h1>
	<p class="text-ink-soft mt-3 text-sm">
		Future of Work can't reach the network right now. Check your connection and try again. Pages
		you've already opened still work offline.
	</p>
	<button
		type="button"
		onclick={() => location.reload()}
		class="bg-ink text-cream hover:bg-terracotta mt-6 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
	>
		Retry
	</button>
</section>
