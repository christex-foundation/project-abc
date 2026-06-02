<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card, CardContent, CardHeader, CardTitle, Button, Separator } from '$lib/components/ui';
	import type { CoachResult } from '$lib/validators/ai';

	let {
		kind,
		slug,
		bountyId,
		projectId,
		aiEnabled
	}: {
		kind: 'BOUNTY' | 'PROJECT';
		slug: string;
		bountyId?: string;
		projectId?: string;
		aiEnabled: boolean;
	} = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let result = $state<CoachResult | null>(null);

	// Staged loading labels — perceived latency on 3G without real streaming (the
	// response is a single validated object, so there's nothing to stream yet).
	const LOADING_STEPS = ['Reading the brief…', 'Planning your approach…', 'Drafting your message…'];
	let stepIndex = $state(0);
	let stepTimer: ReturnType<typeof setInterval> | null = null;

	function startSteps() {
		stepIndex = 0;
		stepTimer = setInterval(() => {
			stepIndex = Math.min(stepIndex + 1, LOADING_STEPS.length - 1);
		}, 1800);
	}
	function stopSteps() {
		if (stepTimer) clearInterval(stepTimer);
		stepTimer = null;
	}

	async function coachMe() {
		loading = true;
		error = null;
		result = null;
		startSteps();
		try {
			const body = kind === 'BOUNTY' ? { bountyId } : { projectId };
			const res = await fetch('/api/ai/coach', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const b = await res.json().catch(() => ({}));
				error = b?.error?.message ?? 'AI is unavailable right now.';
				return;
			}
			const b = await res.json();
			result = b.result as CoachResult;
		} catch {
			error = 'Something went wrong. Please try again.';
		} finally {
			stopSteps();
			loading = false;
		}
	}

	// Plain text → the HTML the apply form's RichTextEditor expects as initialHTML.
	// It only becomes *stored* HTML after proposalService.submit's sanitizeRichText.
	function esc(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
	function toHtml(text: string): string {
		return text
			.split(/\n{2,}/)
			.map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
			.join('');
	}

	// Hand the cover letter to the project /apply form via its localStorage draft
	// (key matches useLocalDraft(`project-apply-<id>`) → prefixed `fow:draft:`).
	function useCoverLetter() {
		if (!result?.communication.coverLetter || !projectId) return;
		const draft = { coverLetter: toHtml(result.communication.coverLetter), proposedTimeline: '' };
		try {
			localStorage.setItem(`fow:draft:project-apply-${projectId}`, JSON.stringify(draft));
		} catch {
			// Storage disabled/full — fall through; the form just won't be prefilled.
		}
		goto(`/projects/${slug}/apply`);
	}
</script>

{#if aiEnabled}
	<Card>
		<CardHeader>
			<CardTitle>Coach me</CardTitle>
		</CardHeader>
		<CardContent class="space-y-3 text-sm">
			{#if !result}
				<p class="text-zinc-600">
					Get AI help on how to approach this work and talk to the company — and the habits that
					carry over to platforms like Upwork.
				</p>
				{#if error}
					<p class="text-red-600">{error}</p>
				{/if}
				<Button class="w-full" onclick={coachMe} disabled={loading}>
					{loading ? LOADING_STEPS[stepIndex] : 'Coach me'}
				</Button>
			{:else}
				<div class="space-y-3">
					<div class="space-y-2">
						<p class="font-semibold text-zinc-900">How to approach it</p>
						<ul class="space-y-2">
							{#each result.approach as a, i (i)}
								<li class="space-y-0.5">
									<p class="text-zinc-800">{a.point}</p>
									<p class="text-xs text-zinc-500">Upwork: {a.whyUpwork}</p>
								</li>
							{/each}
						</ul>
					</div>

					<Separator />

					<div class="space-y-2">
						<p class="font-semibold text-zinc-900">Talking to the company</p>
						<p class="whitespace-pre-wrap text-zinc-800">{result.communication.message}</p>
						{#if result.communication.clarifyingQuestions.length > 0}
							<p class="text-xs font-medium text-zinc-500">Questions worth asking</p>
							<ul class="list-disc space-y-1 pl-5 text-zinc-700">
								{#each result.communication.clarifyingQuestions as q, i (i)}
									<li>{q}</li>
								{/each}
							</ul>
						{/if}
					</div>

					{#if kind === 'PROJECT' && result.communication.coverLetter}
						<Separator />
						<div class="space-y-2">
							<p class="font-semibold text-zinc-900">Draft cover letter</p>
							<p class="whitespace-pre-wrap text-zinc-800">{result.communication.coverLetter}</p>
							<Button class="w-full" onclick={useCoverLetter}>Use this cover letter →</Button>
						</div>
					{/if}

					<p class="text-xs text-zinc-500">
						AI drafts only — review and edit before you submit. Nothing is sent until you submit it
						yourself.
					</p>
					<Button variant="ghost" class="w-full" onclick={() => (result = null)}>Start over</Button>
				</div>
			{/if}
		</CardContent>
	</Card>
{/if}
