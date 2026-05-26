<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Button,
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		Input,
		Label,
		Textarea,
		Badge
	} from '$lib/components/ui';
	import RichTextEditor from '$lib/components/editor/RichTextEditor.svelte';
	import { untrack } from 'svelte';

	let { data, form } = $props();

	const bounty = $derived(data.bounty);
	const eligibility = $derived.by(() => {
		const e = bounty.eligibility;
		return Array.isArray(e) ? (e as Array<{ question: string; optional?: boolean }>) : [];
	});

	let otherInfoHtml = $state<string>(
		untrack(() => (form?.values?.otherInfo as string | null) ?? '')
	);

	function formatMoney(minor: number | null | undefined, currency: string) {
		if (minor == null) return '—';
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}
</script>

<article class="mx-auto max-w-2xl space-y-6">
	<header class="space-y-2">
		<div class="text-sm text-zinc-500">
			<a href={`/bounties/${bounty.slug}`} class="underline">{bounty.title}</a>
		</div>
		<h1 class="text-2xl font-semibold">Submit your work</h1>
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<Badge variant="outline">{bounty.type}</Badge>
			<Badge variant="outline">{bounty.compensationType}</Badge>
			{#if bounty.compensationType === 'RANGE'}
				<span class="text-zinc-500">
					Range: {formatMoney(bounty.minRewardAsk, bounty.currency)} – {formatMoney(
						bounty.maxRewardAsk,
						bounty.currency
					)}
				</span>
			{/if}
		</div>
	</header>

	{#if form?.message}
		<div class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
			{form.message}
		</div>
	{/if}

	<form method="POST" use:enhance class="space-y-6">
		<Card>
			<CardHeader><CardTitle>Your submission</CardTitle></CardHeader>
			<CardContent class="space-y-4">
				<div>
					<Label for="link">Submission link (required)</Label>
					<Input
						id="link"
						name="link"
						type="url"
						placeholder="https://github.com/you/your-work"
						required
						value={(form?.values?.link as string) ?? ''}
					/>
					<p class="mt-1 text-xs text-zinc-500">
						Paste a public URL — GitHub, Drive, deployed app, anywhere reachable.
					</p>
				</div>

				<div>
					<Label for="tweet">Tweet / social link (optional)</Label>
					<Input
						id="tweet"
						name="tweet"
						type="url"
						placeholder="https://x.com/you/status/..."
						value={(form?.values?.tweet as string) ?? ''}
					/>
				</div>

				{#if bounty.compensationType !== 'FIXED'}
					<div>
						<Label for="ask">
							Your ask in minor units (
							{bounty.compensationType === 'RANGE'
								? `${bounty.minRewardAsk} – ${bounty.maxRewardAsk}`
								: 'propose any amount'})
						</Label>
						<Input
							id="ask"
							name="ask"
							type="number"
							min={bounty.minRewardAsk ?? 1}
							max={bounty.maxRewardAsk ?? undefined}
							required
							value={(form?.values?.ask as number | null) ?? ''}
						/>
					</div>
				{/if}

				<div>
					<Label for="otherInfo">Additional info (optional)</Label>
					<RichTextEditor
						initialHTML={otherInfoHtml}
						placeholder="Anything else the sponsor should know…"
						onChange={(html) => (otherInfoHtml = html)}
					/>
					<!-- mirror the editor HTML into a hidden field for the form action -->
					<input type="hidden" name="otherInfo" value={otherInfoHtml} />
				</div>
			</CardContent>
		</Card>

		{#if eligibility.length > 0}
			<Card>
				<CardHeader><CardTitle>Eligibility questions</CardTitle></CardHeader>
				<CardContent class="space-y-4">
					{#each eligibility as q, i (i)}
						<div>
							<Label for={`q-${i}`}>
								{q.question}{q.optional ? ' (optional)' : ''}
							</Label>
							<Textarea id={`q-${i}`} name={`eligibility[${q.question}]`} rows={3} />
						</div>
					{/each}
				</CardContent>
			</Card>
		{/if}

		<div class="flex justify-end gap-2">
			<Button variant="outline" href={`/bounties/${bounty.slug}`}>Cancel</Button>
			<Button type="submit">Submit work</Button>
		</div>
	</form>
</article>
