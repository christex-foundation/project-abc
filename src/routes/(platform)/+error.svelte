<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="mx-auto mt-12 max-w-lg px-4 text-center">
	<div class="text-3xl font-bold text-zinc-900">{page.status}</div>
	<h1 class="mt-2 text-base font-semibold text-zinc-900">
		{page.status === 403 ? 'You do not have access to this page.' : 'Something went wrong'}
	</h1>
	<p class="mt-2 text-sm text-zinc-500">
		{page.error?.message ?? 'Please try again, or go back to your dashboard.'}
	</p>
	<div class="mt-6 flex justify-center gap-3">
		<a
			href="/"
			class="inline-flex items-center rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900"
		>
			Home
		</a>
		<a
			href="/dashboard"
			class="inline-flex items-center rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
		>
			Dashboard
		</a>
	</div>
</div>
