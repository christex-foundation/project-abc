<script lang="ts">
	import { enhance } from '$app/forms';
	import { trackSubmit } from '$lib/client/forms';

	let { data, form } = $props();
	let role = $state<'FREELANCER' | 'COMPANY'>('FREELANCER');
	let submitting = $state(false);
	const referralCode = $derived(data.referralCode);
</script>

<h1 class="fow-display text-ink text-3xl">Create your account</h1>
<p class="text-ink-soft mt-2 text-sm">Join Learn2Earn and start earning on your skills.</p>

<div class="border-bone bg-paper mt-6 flex gap-1 rounded-full border p-1 text-sm">
	<button
		type="button"
		class="flex-1 rounded-full px-3 py-2 font-medium transition-colors {role === 'FREELANCER'
			? 'text-ink bg-white shadow-[var(--shadow-card)]'
			: 'text-ink-soft hover:text-ink'}"
		onclick={() => (role = 'FREELANCER')}
	>
		Freelancer
	</button>
	{#if data.companySelfRegisterEnabled}
		<button
			type="button"
			class="flex-1 rounded-full px-3 py-2 font-medium transition-colors {role === 'COMPANY'
				? 'text-ink bg-white shadow-[var(--shadow-card)]'
				: 'text-ink-soft hover:text-ink'}"
			onclick={() => (role = 'COMPANY')}
		>
			Company
		</button>
	{/if}
</div>

{#if !data.companySelfRegisterEnabled}
	<p class="text-ink-soft mt-2 text-xs">
		Companies join Learn2Earn by invite only. Talk to your admin to get one.
	</p>
{/if}

<form
	method="POST"
	action={role === 'FREELANCER' ? '?/freelancer' : '?/company'}
	use:enhance={trackSubmit((v) => (submitting = v))}
	class="mt-6 space-y-4"
>
	<label class="text-ink block text-sm font-medium">
		Your name <span class="text-terracotta">*</span>
		<input
			name="name"
			required
			minlength="1"
			class="border-bone bg-cream focus-visible:ring-terracotta focus-visible:ring-offset-cream mt-1.5 block min-h-[44px] w-full rounded-xl border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
		/>
	</label>
	{#if role === 'COMPANY'}
		<label class="text-ink block text-sm font-medium">
			Company name <span class="text-terracotta">*</span>
			<input
				name="companyName"
				required
				minlength="1"
				class="border-bone bg-cream focus-visible:ring-terracotta focus-visible:ring-offset-cream mt-1.5 block min-h-[44px] w-full rounded-xl border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
			/>
		</label>
	{/if}
	<label class="text-ink block text-sm font-medium">
		Email <span class="text-terracotta">*</span>
		<input
			type="email"
			name="email"
			required
			class="border-bone bg-cream focus-visible:ring-terracotta focus-visible:ring-offset-cream mt-1.5 block min-h-[44px] w-full rounded-xl border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
		/>
	</label>
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
	{#if role === 'FREELANCER' && referralCode}
		<input type="hidden" name="referralCode" value={referralCode} />
		<p class="bg-forest-soft text-forest rounded-xl px-3 py-2 text-xs">
			You were invited with code <span class="font-mono font-semibold">{referralCode}</span>.
		</p>
	{/if}
	{#if form?.error}
		<p class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
	{/if}
	<button
		type="submit"
		disabled={submitting}
		class="bg-ink text-cream hover:bg-terracotta min-h-[44px] w-full rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
	>
		{submitting ? 'Creating account…' : 'Create account'}
	</button>
</form>
<p class="text-ink-soft mt-5 text-center text-sm">
	Already have an account?
	<a href="/login" class="text-terracotta underline-offset-4 hover:underline">Sign in</a>
</p>
