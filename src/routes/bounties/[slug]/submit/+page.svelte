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
	import { trackSubmit } from '$lib/client/forms';
	import { untrack } from 'svelte';

	let { data, form } = $props();
	let submitting = $state(false);

	const bounty = $derived(data.bounty);
	const credits = $derived(data.credits);
	const eligibility = $derived.by(() => {
		const e = bounty.eligibility;
		return Array.isArray(e) ? (e as Array<{ question: string; optional?: boolean }>) : [];
	});
	const creditExempt = $derived(bounty.creditsExempt === true);
	const willCharge = $derived(!!credits && !creditExempt);
	const noCredits = $derived(willCharge && (credits?.balance ?? 0) < 1);

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
		<div class="text-ink-soft text-sm">
			<a href={`/bounties/${bounty.slug}`} class="hover:text-terracotta underline transition-colors"
				>{bounty.title}</a
			>
		</div>
		<h1 class="fow-display text-ink text-3xl">Submit your work</h1>
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<Badge variant="outline">{bounty.type}</Badge>
			<Badge variant="outline">{bounty.compensationType}</Badge>
			{#if bounty.compensationType === 'RANGE'}
				<span class="text-ink-soft">
					Range: {formatMoney(bounty.minRewardAsk, bounty.currency)} – {formatMoney(
						bounty.maxRewardAsk,
						bounty.currency
					)}
				</span>
			{/if}
		</div>
	</header>

	{#if form?.message}
		<div class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
			{form.message}
		</div>
	{/if}

	{#if credits && creditExempt}
		<div class="border-forest/30 bg-forest-soft text-forest rounded-xl border px-3 py-2 text-sm">
			This bounty is credit-exempt. Submitting won't use a credit.
		</div>
	{:else if credits && noCredits}
		<div class="border-ochre/40 bg-ochre-soft text-clay rounded-xl border px-3 py-2 text-sm">
			You have no credits left this month (0 / {credits.monthlyAllocation}). Credits reset on the
			1st of next month.
		</div>
	{:else if credits}
		<div class="border-bone bg-paper text-ink-soft rounded-xl border px-3 py-2 text-sm">
			Cost: 1 credit. You have <span class="text-ink font-medium">{credits.balance}</span> of
			{credits.monthlyAllocation} this month.
		</div>
	{/if}

	<form method="POST" use:enhance={trackSubmit((v) => (submitting = v))} class="space-y-6">
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
					<p class="text-ink-soft mt-1 text-xs">
						Paste a public URL: GitHub, Drive, a deployed app, anywhere reachable.
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

		<div class="flex flex-col items-end gap-2">
			<div class="flex justify-end gap-2">
				<Button variant="outline" href={`/bounties/${bounty.slug}`}>Cancel</Button>
				<Button type="submit" disabled={noCredits || submitting}>
					{submitting ? 'Submitting…' : 'Submit work'}
				</Button>
			</div>
			{#if willCharge}
				<p class="text-ink-soft text-xs">Credits are spent at submission and aren't refunded.</p>
			{/if}
		</div>
	</form>
</article>
