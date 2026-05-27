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

	{#if credits && creditExempt}
		<div
			class="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
		>
			This bounty is credit-exempt — submitting will not use a credit.
		</div>
	{:else if credits && noCredits}
		<div class="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
			You have no credits remaining this month (0 / {credits.monthlyAllocation}). Credits reset on
			the 1st of next month.
		</div>
	{:else if credits}
		<div class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
			Cost: 1 credit. You have <span class="font-medium">{credits.balance}</span> of
			{credits.monthlyAllocation} this month.
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

		<div class="flex flex-col items-end gap-2">
			<div class="flex justify-end gap-2">
				<Button variant="outline" href={`/bounties/${bounty.slug}`}>Cancel</Button>
				<Button type="submit" disabled={noCredits}>Submit work</Button>
			</div>
			{#if willCharge}
				<p class="text-xs text-zinc-500">
					Credits are spent at submission time and are not refunded.
				</p>
			{/if}
		</div>
	</form>
</article>
