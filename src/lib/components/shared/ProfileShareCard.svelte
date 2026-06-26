<script lang="ts">
	import { page } from '$app/state';
	import {
		Button,
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
		Input,
		Label
	} from '$lib/components/ui';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';

	// `handle` is bindable so the parent form submits it alongside the rest of the
	// profile (the handle is persisted on the shared "Save profile" action).
	let { handle = $bindable('') }: { handle: string } = $props();

	const url = $derived(`${page.url.origin}/u/${handle}`);
	let copied = $state(false);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard blocked (insecure context / permissions) — the link stays
			// visible for manual copy.
		}
	}
</script>

<Card>
	<CardHeader>
		<CardTitle>Public profile</CardTitle>
		<CardDescription
			>Share this link anywhere — anyone can view it, no login needed.</CardDescription
		>
	</CardHeader>
	<CardContent class="space-y-4">
		<div class="flex items-end gap-2">
			<div class="min-w-0 flex-1 space-y-1">
				<Label for="profile-link">Your link</Label>
				<Input id="profile-link" value={url} readonly class="font-mono text-xs" />
			</div>
			<Button type="button" variant="outline" onclick={copyLink} class="shrink-0">
				{#if copied}
					<Check class="h-4 w-4" /> Copied
				{:else}
					<Copy class="h-4 w-4" /> Copy
				{/if}
			</Button>
		</div>
		<div class="space-y-1">
			<Label for="handle">Handle</Label>
			<div class="flex items-center gap-2">
				<span class="text-ink-soft text-sm">/u/</span>
				<Input
					id="handle"
					bind:value={handle}
					maxlength={40}
					placeholder="your-name"
					class="flex-1"
				/>
			</div>
			<p class="text-ink-soft text-xs">
				Lowercase letters, numbers and hyphens. Changing this changes your link. Saved with your
				profile below.
			</p>
		</div>
	</CardContent>
</Card>
