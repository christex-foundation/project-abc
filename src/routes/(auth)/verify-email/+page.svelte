<script lang="ts">
	import { page } from '$app/state';
</script>

<h1 class="text-xl font-semibold">Check your inbox</h1>
{#if page.url.searchParams.get('error')}
	<p class="mt-4 text-sm text-red-600">{page.url.searchParams.get('error')}</p>
{:else}
	<p class="mt-4 text-sm">
		We've sent you a verification link. Click it to activate your account, then return to
		<a class="underline" href="/login">sign in</a>.
	</p>
	<p class="mt-2 text-xs text-zinc-500">
		In local dev, the link is printed to the server console. Open the terminal running
		<code>npm run dev</code> to find it.
	</p>
{/if}
