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
		await goto('/', { invalidateAll: true });
	}
</script>

<h1 class="fow-display text-ink text-3xl">Welcome back</h1>
<p class="text-ink-soft mt-2 text-sm">Sign in to pick up where you left off.</p>

<form class="mt-6 space-y-4" onsubmit={submit}>
	<label class="text-ink block text-sm font-medium">
		Email <span class="text-terracotta">*</span>
		<input
			type="email"
			required
			bind:value={email}
			aria-invalid={error ? 'true' : undefined}
			class="border-bone bg-cream focus-visible:ring-terracotta focus-visible:ring-offset-cream mt-1.5 block min-h-[44px] w-full rounded-xl border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
		/>
	</label>
	<label class="text-ink block text-sm font-medium">
		Password <span class="text-terracotta">*</span>
		<input
			type="password"
			required
			bind:value={password}
			aria-invalid={error ? 'true' : undefined}
			class="border-bone bg-cream focus-visible:ring-terracotta focus-visible:ring-offset-cream mt-1.5 block min-h-[44px] w-full rounded-xl border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
		/>
	</label>
	{#if error}
		<p class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
	{/if}
	<button
		type="submit"
		disabled={loading}
		class="bg-ink text-cream hover:bg-terracotta min-h-[44px] w-full rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
	>
		{loading ? 'Signing in…' : 'Sign in'}
	</button>
</form>
<p class="text-ink-soft mt-5 text-center text-sm">
	<a href="/forgot-password" class="text-terracotta underline-offset-4 hover:underline"
		>Forgot your password?</a
	>
</p>
<p class="text-ink-soft mt-2 text-center text-sm">
	No account yet?
	<a href="/register" class="text-terracotta underline-offset-4 hover:underline">Sign up</a>
</p>
