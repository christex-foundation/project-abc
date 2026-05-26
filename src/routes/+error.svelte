<script lang="ts">
	import { page } from '$app/state';
</script>

<div
	class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center"
>
	<div class="text-4xl font-bold text-zinc-900">{page.status}</div>
	<h1 class="mt-2 text-lg font-semibold text-zinc-900">Something went wrong</h1>
	<p class="mt-2 text-sm text-zinc-500">
		{page.error?.message ?? 'An unexpected error occurred.'}
	</p>
	<a
		href="/"
		class="mt-6 inline-flex items-center rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
	>
		Back to home
	</a>
</div>
