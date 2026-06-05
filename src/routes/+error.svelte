<script lang="ts">
	import { page } from '$app/state';
</script>

<div
	class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center"
>
	<div class="fow-display text-terracotta text-7xl">{page.status}</div>
	<h1 class="text-ink mt-3 text-lg font-semibold tracking-tight">Something went wrong</h1>
	<p class="text-ink-soft mt-2 text-sm">
		{page.error?.message ?? 'An unexpected error occurred.'}
	</p>
	<a
		href="/"
		class="bg-ink text-cream hover:bg-terracotta mt-6 inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
	>
		Back to home
	</a>
</div>
