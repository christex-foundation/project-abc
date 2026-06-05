<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="mx-auto mt-16 max-w-lg px-4 text-center">
	<div class="fow-display text-terracotta text-6xl">{page.status}</div>
	<h1 class="text-ink mt-3 text-lg font-semibold tracking-tight">
		{page.status === 403 ? "You don't have access to this page." : 'Something went wrong'}
	</h1>
	<p class="text-ink-soft mt-2 text-sm">
		{page.error?.message ?? 'Try again, or head back to your dashboard.'}
	</p>
	<div class="mt-6 flex justify-center gap-3">
		<a
			href="/"
			class="border-bone bg-cream text-ink hover:border-ink inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-medium transition-colors"
		>
			Home
		</a>
		<a
			href="/dashboard"
			class="bg-ink text-cream hover:bg-terracotta inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
		>
			Dashboard
		</a>
	</div>
</div>
