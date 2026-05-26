<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="mx-auto mt-12 max-w-md px-4 text-center">
	<div class="text-3xl font-bold text-zinc-900">{page.status}</div>
	<h1 class="mt-2 text-base font-semibold text-zinc-900">Sign-in error</h1>
	<p class="mt-2 text-sm text-zinc-500">
		{page.error?.message ?? 'Could not complete this auth step. Please try again.'}
	</p>
	<a
		href="/login"
		class="mt-6 inline-flex items-center rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
	>
		Back to login
	</a>
</div>
