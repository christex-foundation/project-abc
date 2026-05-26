<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<h1 class="text-xl font-semibold">Set your password</h1>
<p class="mt-2 text-sm text-zinc-600">
	Welcome to FOW. Pick a password to finish setting up your company account.
</p>

{#if !data.token}
	<p class="mt-4 text-sm text-red-600">Missing reset token. Use the link from your invite email.</p>
{:else}
	<form method="POST" use:enhance class="mt-4 space-y-3">
		<input type="hidden" name="token" value={data.token} />
		<label class="block text-sm">
			Password
			<input
				type="password"
				name="password"
				required
				minlength="8"
				class="mt-1 block w-full rounded border border-zinc-300 px-3 py-2"
			/>
			<span class="mt-1 block text-xs text-zinc-500">At least 8 characters with one digit.</span>
		</label>
		{#if form?.error}
			<p class="text-sm text-red-600">{form.error}</p>
		{/if}
		<button type="submit" class="w-full rounded bg-zinc-900 px-4 py-2 text-white">
			Finish setup
		</button>
	</form>
{/if}
