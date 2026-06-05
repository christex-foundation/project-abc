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

<h1 class="fow-display text-ink text-3xl">Reset your password</h1>
{#if sent}
	<p class="text-ink-soft mt-4 text-sm">
		If an account exists for that email, a reset link is on its way. Check your inbox.
	</p>
{:else}
	<p class="text-ink-soft mt-2 text-sm">
		Enter your email and we'll send you a link to set a new password.
	</p>
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
		{#if error}
			<p class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
		{/if}
		<button
			type="submit"
			disabled={loading}
			class="bg-ink text-cream hover:bg-terracotta min-h-[44px] w-full rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
		>
			{loading ? 'Sending…' : 'Send reset link'}
		</button>
	</form>
{/if}
