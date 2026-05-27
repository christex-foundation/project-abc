<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button, Input, Label } from '$lib/components/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let confirmText = $state('');
	let password = $state('');
	let deleting = $state(false);
	let deleteError: string | null = $state(null);

	const canSubmit = $derived(
		confirmText === 'DELETE' &&
			data.blockers.length === 0 &&
			(!data.hasPassword || password.length > 0) &&
			!deleting
	);

	async function onDelete(e: SubmitEvent) {
		e.preventDefault();
		if (!canSubmit) return;
		deleting = true;
		deleteError = null;
		try {
			const res = await fetch('/api/me/account/delete', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					confirm: 'DELETE',
					...(data.hasPassword ? { password } : {})
				})
			});
			if (res.ok) {
				await goto('/goodbye');
				return;
			}
			const body = await res.json().catch(() => ({}));
			deleteError = body?.error?.message ?? 'Could not delete your account.';
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Network error.';
		} finally {
			deleting = false;
		}
	}
</script>

<section class="space-y-6 p-4 md:p-6">
	<header>
		<h1 class="text-xl font-semibold text-zinc-900">Account</h1>
		<p class="mt-1 text-sm text-zinc-600">
			Download a copy of everything we hold about you, or permanently delete your account.
		</p>
	</header>

	<section class="rounded-lg border border-zinc-200 bg-white p-4">
		<h2 class="text-sm font-semibold text-zinc-700">Download your data</h2>
		<p class="mt-1 text-xs text-zinc-600">
			We'll prepare a ZIP with your profile, activity, and a <code>data.json</code> bundle of everything
			the platform stores about you. CSV files are included for tabular records.
		</p>
		<div class="mt-3">
			<Button href="/api/me/account/export" variant="default" size="sm">
				Download my data (.zip)
			</Button>
		</div>
	</section>

	<section class="rounded-lg border border-red-200 bg-white p-4">
		<h2 class="text-sm font-semibold text-red-700">Delete account</h2>
		<p class="mt-1 text-xs text-zinc-600">
			This permanently erases your profile, sessions, and personal data. Records that involve other
			people (bounties, submissions, payments you participated in) survive without your identity
			attached so the counterparty keeps their history.
		</p>

		{#if data.blockers.length > 0}
			<div class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
				<p class="text-xs font-semibold text-amber-800">
					Resolve these before you can delete your account:
				</p>
				<ul class="mt-2 space-y-1 text-xs text-amber-900">
					{#each data.blockers as b (b.code)}
						<li class="flex items-start gap-2">
							<span aria-hidden="true">•</span>
							<span>
								{b.message}
								{#if b.link}
									<a class="ml-1 font-medium underline" href={b.link}>Resolve</a>
								{/if}
							</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<form onsubmit={onDelete} class="mt-4 space-y-3">
			<div>
				<Label for="confirm-delete">Type <span class="font-mono">DELETE</span> to confirm</Label>
				<Input
					id="confirm-delete"
					type="text"
					bind:value={confirmText}
					autocomplete="off"
					disabled={data.blockers.length > 0}
				/>
			</div>

			{#if data.hasPassword}
				<div>
					<Label for="confirm-password">Your password</Label>
					<Input
						id="confirm-password"
						type="password"
						bind:value={password}
						autocomplete="current-password"
						disabled={data.blockers.length > 0}
					/>
				</div>
			{/if}

			{#if deleteError}
				<p class="text-xs text-red-600">{deleteError}</p>
			{/if}

			<Button type="submit" variant="destructive" size="sm" disabled={!canSubmit}>
				{deleting ? 'Deleting…' : 'Permanently delete my account'}
			</Button>
		</form>
	</section>
</section>
