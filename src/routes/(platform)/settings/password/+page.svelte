<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { authClient } from '$lib/client/auth-client';
	import { Button, Input, Label } from '$lib/components/ui';
	import { changePasswordInput } from '$lib/validators/account';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let saving = $state(false);
	let error: string | null = $state(null);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (saving) return;
		error = null;

		const parsed = changePasswordInput.safeParse({
			currentPassword,
			newPassword,
			confirmPassword
		});
		if (!parsed.success) {
			error = parsed.error.issues[0]?.message ?? 'Check the fields and try again.';
			return;
		}

		saving = true;
		try {
			const res = await authClient.changePassword({
				currentPassword: parsed.data.currentPassword,
				newPassword: parsed.data.newPassword,
				// Sign out other devices after a password change; current session stays.
				revokeOtherSessions: true
			});
			if (res.error) {
				error = res.error.message ?? 'Could not change your password.';
				return;
			}
			toast.success('Password changed.');
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Network error.';
		} finally {
			saving = false;
		}
	}
</script>

<section class="space-y-6 p-4 md:p-6">
	<header>
		<h1 class="fow-display text-ink text-3xl">Change password</h1>
		<p class="text-ink-soft mt-1 text-sm">Update the password you use to sign in.</p>
	</header>

	<section
		class="border-bone rounded-[var(--radius-card)] border bg-white p-5 shadow-[var(--shadow-card)]"
	>
		{#if !data.hasPassword}
			<h2 class="text-ink font-semibold tracking-tight">No password on this account</h2>
			<p class="text-ink-soft mt-1 text-xs">
				You signed in with Google, so there's no password to change. Manage sign-in from your Google
				account.
			</p>
		{:else}
			<form onsubmit={onSubmit} class="space-y-4">
				<div>
					<Label for="current-password">Current password</Label>
					<Input
						id="current-password"
						type="password"
						bind:value={currentPassword}
						autocomplete="current-password"
					/>
				</div>

				<div>
					<Label for="new-password">New password</Label>
					<Input
						id="new-password"
						type="password"
						bind:value={newPassword}
						autocomplete="new-password"
					/>
					<p class="text-ink-soft mt-1 text-xs">At least 8 characters and one digit.</p>
				</div>

				<div>
					<Label for="confirm-password">Confirm new password</Label>
					<Input
						id="confirm-password"
						type="password"
						bind:value={confirmPassword}
						autocomplete="new-password"
					/>
				</div>

				{#if error}
					<p class="text-xs text-red-600">{error}</p>
				{/if}

				<Button type="submit" variant="default" size="sm" disabled={saving}>
					{saving ? 'Saving…' : 'Change password'}
				</Button>
			</form>
		{/if}
	</section>
</section>
