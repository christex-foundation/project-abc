<script lang="ts">
	import { page } from '$app/state';
</script>

<h1 class="fow-display text-ink text-3xl">Check your inbox</h1>
{#if page.url.searchParams.get('error')}
	<p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
		{page.url.searchParams.get('error')}
	</p>
{:else}
	<p class="text-ink-soft mt-4 text-sm">
		We've sent you a verification link. Click it to activate your account, then come back to
		<a class="text-terracotta underline-offset-4 hover:underline" href="/login">sign in</a>.
	</p>
	<p class="text-ink-soft mt-2 text-xs">
		In local dev, the link is printed to the server console. Open the terminal running
		<code class="font-mono">npm run dev</code> to find it.
	</p>
{/if}
