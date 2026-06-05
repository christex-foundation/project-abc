<script lang="ts">
	import { enhance } from '$app/forms';
	import { trackSubmit } from '$lib/client/forms';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<h1 class="fow-display text-ink text-3xl">Set your password</h1>
<p class="text-ink-soft mt-2 text-sm">
	Welcome to FOW. Pick a password to finish setting up your company account.
</p>

{#if !data.token}
	<p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
		Missing reset token. Use the link from your invite email.
	</p>
{:else}
	<form method="POST" use:enhance={trackSubmit((v) => (submitting = v))} class="mt-6 space-y-4">
		<input type="hidden" name="token" value={data.token} />
		<label class="text-ink block text-sm font-medium">
			Password <span class="text-terracotta">*</span>
			<input
				type="password"
				name="password"
				required
				minlength="8"
				class="border-bone bg-cream focus-visible:ring-terracotta focus-visible:ring-offset-cream mt-1.5 block min-h-[44px] w-full rounded-xl border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
			/>
			<span class="text-ink-soft mt-1.5 block text-xs">At least 8 characters with one digit.</span>
		</label>
		{#if form?.error}
			<p class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
		{/if}
		<button
			type="submit"
			disabled={submitting}
			class="bg-ink text-cream hover:bg-terracotta min-h-[44px] w-full rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
		>
			{submitting ? 'Setting up…' : 'Finish setup'}
		</button>
	</form>
{/if}
