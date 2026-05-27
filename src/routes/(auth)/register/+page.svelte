<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let role = $state<'FREELANCER' | 'COMPANY'>('FREELANCER');
	const referralCode = $derived(data.referralCode);
</script>

<h1 class="text-xl font-semibold">Create your account</h1>

<div class="mt-4 flex gap-2 rounded border border-zinc-200 bg-zinc-50 p-1 text-sm">
	<button
		type="button"
		class="flex-1 rounded px-3 py-1 {role === 'FREELANCER' ? 'bg-white shadow' : ''}"
		onclick={() => (role = 'FREELANCER')}
	>
		Freelancer
	</button>
	{#if data.companySelfRegisterEnabled}
		<button
			type="button"
			class="flex-1 rounded px-3 py-1 {role === 'COMPANY' ? 'bg-white shadow' : ''}"
			onclick={() => (role = 'COMPANY')}
		>
			Company
		</button>
	{/if}
</div>

{#if !data.companySelfRegisterEnabled}
	<p class="mt-2 text-xs text-zinc-500">
		Companies join FOW by invitation only. Contact your admin.
	</p>
{/if}

<form
	method="POST"
	action={role === 'FREELANCER' ? '?/freelancer' : '?/company'}
	use:enhance
	class="mt-4 space-y-3"
>
	<label class="block text-sm">
		Your name
		<input
			name="name"
			required
			minlength="1"
			class="mt-1 block w-full rounded border border-zinc-300 px-3 py-2"
		/>
	</label>
	{#if role === 'COMPANY'}
		<label class="block text-sm">
			Company name
			<input
				name="companyName"
				required
				minlength="1"
				class="mt-1 block w-full rounded border border-zinc-300 px-3 py-2"
			/>
		</label>
	{/if}
	<label class="block text-sm">
		Email
		<input
			type="email"
			name="email"
			required
			class="mt-1 block w-full rounded border border-zinc-300 px-3 py-2"
		/>
	</label>
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
	{#if role === 'FREELANCER' && referralCode}
		<input type="hidden" name="referralCode" value={referralCode} />
		<p class="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
			You were invited with code <span class="font-mono font-semibold">{referralCode}</span>.
		</p>
	{/if}
	{#if form?.error}
		<p class="text-sm text-red-600">{form.error}</p>
	{/if}
	<button type="submit" class="w-full rounded bg-zinc-900 px-4 py-2 text-white">
		Create account
	</button>
</form>
<p class="mt-4 text-center text-sm text-zinc-600">
	Already have an account?
	<a href="/login" class="underline">Sign in</a>
</p>
