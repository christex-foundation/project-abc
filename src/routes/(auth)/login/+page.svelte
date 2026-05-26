<script lang="ts">
	import { authClient } from '$lib/client/auth-client';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		loading = true;
		const res = await authClient.signIn.email({ email, password });
		loading = false;
		if (res.error) {
			error = res.error.message ?? 'Sign-in failed.';
			return;
		}
		goto('/');
	}
</script>

<h1 class="text-xl font-semibold">Sign in</h1>
<form class="mt-4 space-y-3" onsubmit={submit}>
	<label class="block text-sm">
		Email
		<input
			type="email"
			required
			bind:value={email}
			class="mt-1 block w-full rounded border border-zinc-300 px-3 py-2"
		/>
	</label>
	<label class="block text-sm">
		Password
		<input
			type="password"
			required
			bind:value={password}
			class="mt-1 block w-full rounded border border-zinc-300 px-3 py-2"
		/>
	</label>
	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
	<button
		type="submit"
		disabled={loading}
		class="w-full rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
	>
		{loading ? 'Signing in…' : 'Sign in'}
	</button>
</form>
<p class="mt-4 text-center text-sm text-zinc-600">
	<a href="/forgot-password" class="underline">Forgot your password?</a>
</p>
<p class="mt-2 text-center text-sm text-zinc-600">
	No account?
	<a href="/register" class="underline">Sign up</a>
</p>
