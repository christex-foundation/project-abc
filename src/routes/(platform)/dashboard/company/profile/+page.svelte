<script lang="ts">
	import { untrack } from 'svelte';
	import {
		Badge,
		Button,
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
		Input,
		Label,
		Textarea
	} from '$lib/components/ui';

	let { data } = $props();

	let companyName = $state(untrack(() => data.profile.companyName ?? ''));
	let description = $state(untrack(() => data.profile.description ?? ''));
	let website = $state(untrack(() => data.profile.website ?? ''));
	let logo = $state(untrack(() => data.profile.logo ?? ''));
	let industry = $state(untrack(() => data.profile.industry ?? ''));
	let country = $state(untrack(() => data.profile.country ?? 'SL'));
	let momo = $state(untrack(() => data.profile.monimePayoutMomoNumber ?? ''));

	let saving = $state(false);
	let savedAt = $state<Date | null>(null);
	let errorMsg = $state<string | null>(null);

	async function save() {
		saving = true;
		errorMsg = null;
		try {
			const res = await fetch('/api/users/me', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					companyName,
					description: description || null,
					website: website || null,
					logo: logo || null,
					industry: industry || null,
					country: country || 'SL',
					monimePayoutMomoNumber: momo || null
				})
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = body?.error?.message ?? `Save failed (${res.status})`;
				return;
			}
			savedAt = new Date();
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold">Company profile</h1>
		<p class="text-sm text-zinc-500">
			This is how freelancers see your company on bounty listings and detail pages.
		</p>
	</header>

	<Card>
		<CardHeader>
			<CardTitle>About your company</CardTitle>
			<CardDescription>Public information shown to freelancers.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-1">
					<Label for="companyName">Company name</Label>
					<Input id="companyName" bind:value={companyName} maxlength={120} required />
				</div>
				<div class="space-y-1">
					<Label for="industry">Industry</Label>
					<Input id="industry" bind:value={industry} maxlength={120} placeholder="e.g. Fintech" />
				</div>
			</div>
			<div class="space-y-1">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					bind:value={description}
					maxlength={5000}
					rows={5}
					placeholder="What your company does, who it serves, and the kind of work you post here."
				/>
			</div>
			<div class="grid gap-4 sm:grid-cols-3">
				<div class="space-y-1">
					<Label for="website">Website</Label>
					<Input
						id="website"
						type="url"
						bind:value={website}
						maxlength={500}
						placeholder="https://"
					/>
				</div>
				<div class="space-y-1">
					<Label for="logo">Logo URL</Label>
					<Input
						id="logo"
						type="url"
						bind:value={logo}
						maxlength={500}
						placeholder="Cloudinary URL"
					/>
				</div>
				<div class="space-y-1">
					<Label for="country">Country</Label>
					<Input id="country" bind:value={country} maxlength={8} placeholder="SL" />
				</div>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Payout</CardTitle>
			<CardDescription>
				Required before cancelling a funded bounty — refunds land here.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="space-y-1">
				<Label for="momo">Mobile money number</Label>
				<Input id="momo" bind:value={momo} maxlength={40} placeholder="+232 …" autocomplete="tel" />
			</div>
		</CardContent>
	</Card>

	<div class="flex items-center gap-3">
		<Button onclick={save} disabled={saving}>
			{saving ? 'Saving…' : 'Save profile'}
		</Button>
		{#if savedAt}
			<Badge variant="success">Saved {savedAt.toLocaleTimeString()}</Badge>
		{/if}
		{#if errorMsg}
			<span class="text-sm text-red-600">{errorMsg}</span>
		{/if}
	</div>
</div>
