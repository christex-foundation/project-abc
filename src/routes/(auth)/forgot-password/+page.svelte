<script lang="ts">
	import { authClient } from '$lib/client/auth-client';

	let email = $state('');
	let sent = $state(false);
	let error = $state<string | null>(null);
	let loading = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		loading = true;
		const res = await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });
		loading = false;
		if (res.error) {
			error = res.error.message ?? 'Failed to send reset link.';
			return;
		}
		sent = true;
	}
</script>

<h1 class="text-xl font-semibold">Reset your password</h1>
{#if sent}
	<p class="mt-4 text-sm">
		If an account exists for that email, a reset link is on its way. Check your inbox.
	</p>
{:else}
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
		{#if error}
			<p class="text-sm text-red-600">{error}</p>
		{/if}
		<button
			type="submit"
			disabled={loading}
			class="w-full rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
		>
			{loading ? 'Sending…' : 'Send reset link'}
		</button>
	</form>
{/if}
