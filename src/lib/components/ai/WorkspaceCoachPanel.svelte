<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle, Button, Separator } from '$lib/components/ui';
	import type { WorkspaceCoachResult } from '$lib/validators/ai';

	type Draft = { note: string; deliverables: { label: string; url: string }[]; comment: string };

	let {
		milestoneId,
		aiEnabled,
		getDraft,
		onApplyReply,
		onApplyNote
	}: {
		milestoneId: string;
		aiEnabled: boolean;
		// Reads the parent's live form state for this milestone.
		getDraft: () => Draft;
		// Write a chosen draft back into the parent's comment / update fields.
		onApplyReply: (text: string) => void;
		onApplyNote: (text: string) => void;
	} = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let result = $state<WorkspaceCoachResult | null>(null);

	// Staged loading labels — perceived latency on 3G without real streaming.
	const LOADING_STEPS = ['Reading the brief…', 'Checking your draft…', 'Drafting…'];
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
			const draft = getDraft();
			const res = await fetch('/api/ai/coach/workspace', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					milestoneId,
					draftNote: draft.note,
					draftDeliverables: draft.deliverables.filter((d) => d.url.trim()),
					draftComment: draft.comment
				})
			});
			if (!res.ok) {
				const b = await res.json().catch(() => ({}));
				error = b?.error?.message ?? 'AI is unavailable right now.';
				return;
			}
			const b = await res.json();
			result = b.result as WorkspaceCoachResult;
		} catch (e) {
			console.error('[ai workspace-coach] request failed:', e);
			error = 'Something went wrong. Please try again.';
		} finally {
			stopSteps();
			loading = false;
		}
	}
</script>

{#if aiEnabled}
	<Card>
		<CardHeader>
			<CardTitle class="text-base">Coach me on this milestone</CardTitle>
		</CardHeader>
		<CardContent class="space-y-3 text-sm">
			{#if !result}
				<p class="text-ink-soft">
					Get AI help making sure your work meets the brief, reading the client's feedback, and
					polishing what you post before you submit for approval.
				</p>
				{#if error}
					<p class="text-red-700">{error}</p>
				{/if}
				<Button class="w-full" onclick={coachMe} disabled={loading}>
					{loading ? LOADING_STEPS[stepIndex] : 'Coach me'}
				</Button>
			{:else}
				<div class="border-terracotta-soft bg-terracotta-soft/40 space-y-3 rounded-xl border p-3">
					<p class="text-clay font-mono text-[11px] font-medium tracking-wide uppercase">
						AI suggestion
					</p>
					<!-- (1) Gaps vs the brief -->
					{#if result.gaps.length > 0}
						<div class="space-y-2">
							<p class="text-ink font-semibold tracking-tight">Before you submit</p>
							<ul class="space-y-2">
								{#each result.gaps as g, i (i)}
									<li class="space-y-0.5">
										<p class="text-ink">{g.point}</p>
										<p class="text-ink-soft text-xs">Fix: {g.suggestion}</p>
									</li>
								{/each}
							</ul>
						</div>
					{:else}
						<p class="text-ink-soft">Your draft looks complete against the brief. 👍</p>
					{/if}

					<!-- Self-check on their own tone/clarity -->
					{#if result.selfCheck.length > 0}
						<div class="border-ochre-soft bg-ochre-soft rounded-xl border p-3">
							<p class="text-clay text-xs font-medium">A quick self-check</p>
							<ul class="text-clay mt-1 list-disc space-y-1 pl-5">
								{#each result.selfCheck as s, i (i)}
									<li>{s}</li>
								{/each}
							</ul>
						</div>
					{/if}

					<!-- (2) Client feedback interpretation + reply -->
					{#if result.clientNeedsSummary || result.replyDraft}
						<Separator />
						<div class="space-y-2">
							<p class="text-ink font-semibold tracking-tight">What the client is asking for</p>
							{#if result.clientNeedsSummary}
								<p class="text-ink whitespace-pre-wrap">{result.clientNeedsSummary}</p>
							{/if}
							{#if result.replyDraft}
								<p class="text-ink-soft text-xs font-medium">Draft reply</p>
								<p class="text-ink whitespace-pre-wrap">{result.replyDraft}</p>
								<Button
									size="sm"
									variant="secondary"
									onclick={() => onApplyReply(result!.replyDraft!)}
								>
									Use this reply →
								</Button>
							{/if}
						</div>
					{/if}

					<!-- (3) Polished update note -->
					{#if result.polishedNote}
						<Separator />
						<div class="space-y-2">
							<p class="text-ink font-semibold tracking-tight">Polished update note</p>
							<p class="text-ink whitespace-pre-wrap">{result.polishedNote}</p>
							<Button
								size="sm"
								variant="secondary"
								onclick={() => onApplyNote(result!.polishedNote!)}
							>
								Use this note →
							</Button>
						</div>
					{/if}

					<p class="text-ink-soft text-xs">
						AI suggestions only. Review and edit before you submit. Nothing is sent until you post
						it yourself.
					</p>
					<Button variant="ghost" class="w-full" onclick={() => (result = null)}>Start over</Button>
				</div>
			{/if}
		</CardContent>
	</Card>
{/if}
