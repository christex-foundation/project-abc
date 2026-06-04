<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount, untrack } from 'svelte';
	import RichTextEditor from '$lib/components/editor/RichTextEditor.svelte';
	import { useLocalDraft } from '$lib/hooks/useLocalDraft';
	import {
		Button,
		Input,
		Label,
		Card,
		CardHeader,
		CardTitle,
		CardContent,
		Separator
	} from '$lib/components/ui';
	import { createProposalInput, findCoverLetterPlaceholders } from '$lib/validators/proposal';

	let { data } = $props();
	const project = $derived(data.project);

	type Draft = { coverLetter: string; proposedTimeline: string };
	const initial: Draft = { coverLetter: '', proposedTimeline: '' };

	const draftStore = useLocalDraft<Draft>(untrack(() => `project-apply-${data.project.id}`));

	// Prefill synchronously (not in onMount) when arriving from the AI coach, so the
	// editor mounts already populated — RichTextEditor reads initialHTML once on mount.
	function loadInitial(): Draft {
		if (browser && new URLSearchParams(window.location.search).has('coach')) {
			const saved = draftStore.load();
			if (saved) return saved;
		}
		return initial;
	}

	let d = $state<Draft>(loadInitial());
	let restorePrompt = $state(false);
	// Bumped to force a RichTextEditor remount so a restored draft is visible.
	let editorKey = $state(0);

	onMount(() => {
		const isCoach = new URLSearchParams(window.location.search).has('coach');
		if (!isCoach && draftStore.load()) restorePrompt = true;
	});

	function restore() {
		const saved = draftStore.load();
		if (saved) d = saved;
		editorKey++;
		restorePrompt = false;
	}
	function discard() {
		draftStore.clear();
		restorePrompt = false;
	}

	$effect(() => {
		void JSON.stringify(d);
		draftStore.save(d);
	});

	function formatMoney(minor: number) {
		return `${project.currency} ${(minor / 100).toLocaleString()}`;
	}

	let submitting = $state(false);
	let submitError = $state<string | null>(null);

	// Coach drafts leave bracketed placeholders ([YOUR NAME], [PLATFORM], …); the
	// freelancer must replace them before this counts as a finished proposal.
	const placeholders = $derived(findCoverLetterPlaceholders(d.coverLetter));

	async function submit() {
		submitting = true;
		submitError = null;
		try {
			if (placeholders.length > 0) {
				submitError = `Replace the remaining placeholders in your cover letter first: ${placeholders.join(', ')}`;
				submitting = false;
				return;
			}

			const payload = {
				coverLetter: d.coverLetter,
				proposedTimeline: d.proposedTimeline || null
			};
			const parsed = createProposalInput.safeParse(payload);
			if (!parsed.success) {
				submitError = parsed.error.issues[0]?.message ?? 'Validation failed.';
				submitting = false;
				return;
			}

			const res = await fetch(`/api/projects/${project.id}/proposals`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				submitError = body?.error?.message ?? 'Failed to submit proposal.';
				submitting = false;
				return;
			}
			draftStore.clear();
			await goto('/dashboard/freelancer/proposals');
		} catch (e) {
			submitError = (e as Error).message;
			submitting = false;
		}
	}
</script>

<div class="space-y-6 px-2 py-4 md:px-0">
	<header>
		<a href={`/projects/${project.slug}`} class="text-sm text-zinc-500 hover:underline">
			← {project.title}
		</a>
		<h1 class="mt-1 text-2xl font-semibold">Apply with a proposal</h1>
		<p class="text-sm text-zinc-500">
			The company has set the milestone plan below (total <strong
				>{formatMoney(project.budgetCap)}</strong
			>). Send a cover letter telling them why you're the right contractor.
		</p>
	</header>

	{#if data.alreadyApplied}
		<Card>
			<CardContent class="py-8 text-center text-zinc-600">
				You've already applied to this project.
				<a href="/dashboard/freelancer/proposals" class="underline">View your proposals</a>.
			</CardContent>
		</Card>
	{:else}
		{#if restorePrompt}
			<Card>
				<CardContent
					class="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<p class="text-sm">You have an unsaved draft for this project. Resume it?</p>
					<div class="flex gap-2">
						<Button size="sm" onclick={restore}>Resume draft</Button>
						<Button size="sm" variant="ghost" onclick={discard}>Discard</Button>
					</div>
				</CardContent>
			</Card>
		{/if}

		<Card>
			<CardHeader><CardTitle>Milestone plan</CardTitle></CardHeader>
			<CardContent>
				<ul class="space-y-1 text-sm">
					{#each project.milestones as m (m.id)}
						<li class="flex justify-between gap-2">
							<span>{m.position}. {m.title}{m.dueInDays ? ` · ${m.dueInDays}d` : ''}</span>
							<span class="font-medium tabular-nums">{formatMoney(m.amount)}</span>
						</li>
					{/each}
				</ul>
				<Separator class="my-3" />
				<div class="flex justify-between text-sm font-semibold">
					<span>Total</span><span>{formatMoney(project.budgetCap)}</span>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader><CardTitle>Your pitch</CardTitle></CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-1">
					<Label for="cover">Cover letter</Label>
					{#key editorKey}
						<RichTextEditor
							initialHTML={d.coverLetter}
							placeholder="Why you're a good fit, relevant experience, your approach…"
							onChange={(html) => (d.coverLetter = html)}
						/>
					{/key}
					{#if placeholders.length > 0}
						<p class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
							Fill in {placeholders.length === 1 ? 'this placeholder' : 'these placeholders'} from the
							AI draft before you submit — replace each with your own details:
							<span class="font-medium">{placeholders.join(', ')}</span>
						</p>
					{/if}
				</div>
				<div class="space-y-1">
					<Label for="timeline">Proposed timeline (optional)</Label>
					<Input id="timeline" bind:value={d.proposedTimeline} placeholder="e.g. 6 weeks" />
				</div>
			</CardContent>
		</Card>

		{#if submitError}<p class="text-sm text-red-600">{submitError}</p>{/if}

		<div class="flex justify-end gap-2">
			<Button variant="ghost" href={`/projects/${project.slug}`}>Cancel</Button>
			<Button onclick={submit} disabled={submitting || placeholders.length > 0}>
				{submitting ? 'Submitting…' : 'Submit proposal'}
			</Button>
		</div>
	{/if}
</div>
