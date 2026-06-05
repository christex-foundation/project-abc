<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="mx-auto mt-12 max-w-md px-4 text-center">
	<div class="fow-display text-ink text-5xl">{page.status}</div>
	<h1 class="text-ink mt-3 text-base font-semibold tracking-tight">Sign-in error</h1>
	<p class="text-ink-soft mt-2 text-sm">
		{page.error?.message ?? 'Something went wrong with this step. Please try again.'}
	</p>
	<a
		href="/login"
		class="bg-ink text-cream hover:bg-terracotta mt-6 inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
	>
		Back to login
	</a>
</div>
