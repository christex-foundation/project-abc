<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		Card,
		CardContent,
		Button,
		Textarea,
		Input,
		Label,
		Badge,
		Separator
	} from '$lib/components/ui';
	import type { ScopeResult } from '$lib/validators/ai';

	let { data } = $props();

	// localStorage keys the create forms read via useLocalDraft (which prefixes
	// `fow:draft:` internally) — we write the prefixed key directly here.
	const STORAGE = {
		bounty: 'fow:draft:bounty-create-wizard-v2',
		project: 'fow:draft:project-create-form'
	} as const;

	let need = $state('');
	let budget = $state(''); // major-unit SLE; converted to minor on submit
	let timeline = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let result = $state<ScopeResult | null>(null);

	async function askAi() {
		if (need.trim().length < 10) {
			error = 'Describe what you need in a sentence or two.';
			return;
		}
		loading = true;
		error = null;
		result = null;
		try {
			const major = budget.trim() ? Number(budget) : NaN;
			const budgetMinor = Number.isFinite(major) ? Math.round(major * 100) : null;
			const res = await fetch('/api/ai/scope', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					need: need.trim(),
					budgetMinor,
					timeline: timeline.trim() || null
				})
			});
			if (!res.ok) {
				const b = await res.json().catch(() => ({}));
				error = b?.error?.message ?? 'AI is unavailable right now.';
				return;
			}
			const body = await res.json();
			result = body.result as ScopeResult;
		} catch {
			error = 'Something went wrong. Please try again.';
		} finally {
			loading = false;
		}
	}

	// --- draft handoff ------------------------------------------------------

	function esc(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
	// Plain text → the HTML the RichTextEditor expects as initialHTML. It only
	// becomes *stored* HTML after the create path's sanitizeRichText on submit.
	function toHtml(text: string | null): string {
		if (!text) return '';
		return text
			.split(/\n{2,}/)
			.map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
			.join('');
	}
	// ISO → `YYYY-MM-DDTHH:mm` local, the format <input type="datetime-local"> needs.
	function toLocalInput(iso: string): string {
		const dt = new Date(iso);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
	}

	// Fields both drafts share — carried over even when overriding the AI's choice.
	function sharedFields(r: ScopeResult) {
		const d = r.draft;
		return {
			title: d.title,
			description: toHtml(d.description),
			requirements: toHtml(d.requirements),
			deliverables: toHtml(d.deliverables),
			skills: d.skills
		};
	}

	function buildBountyDraft(r: ScopeResult) {
		const s = sharedFields(r);
		const b = r.type === 'BOUNTY' ? r.draft : null;
		return {
			step: 1,
			title: s.title,
			description: s.description,
			requirements: s.requirements,
			deliverables: s.deliverables,
			skills: s.skills,
			compensationType: b?.compensationType ?? '',
			currency: 'SLE',
			totalPrizePool: b ? b.totalPrizePool : '',
			minRewardAsk: '',
			maxRewardAsk: '',
			numberOfWinners: b?.numberOfWinners ?? 1,
			maxBonusSpots: b?.maxBonusSpots ?? 0,
			prizeTiers: b
				? b.prizeTiers.map((t) => ({
						position: t.position,
						amount: t.amount,
						label: t.label ?? undefined
					}))
				: [],
			eligibility: [],
			timeToComplete: '',
			submissionDeadline: b ? toLocalInput(b.submissionDeadline) : '',
			judgingDeadline: ''
		};
	}

	function buildProjectDraft(r: ScopeResult) {
		const s = sharedFields(r);
		const p = r.type === 'PROJECT' ? r.draft : null;
		const milestones =
			p && p.milestones.length
				? p.milestones.map((m) => ({
						title: m.title,
						amount: m.amount,
						description: m.description ?? '',
						dueInDays: m.dueInDays ?? ''
					}))
				: [{ title: '', amount: '', description: '', dueInDays: '' }];
		return {
			title: s.title,
			description: s.description,
			requirements: s.requirements,
			deliverables: s.deliverables,
			currency: 'SLE',
			timeToComplete: p?.timeToComplete ?? '',
			skills: s.skills,
			milestones
		};
	}

	function useDraft(target: 'bounty' | 'project') {
		if (!result) return;
		const payload = target === 'bounty' ? buildBountyDraft(result) : buildProjectDraft(result);
		try {
			localStorage.setItem(STORAGE[target], JSON.stringify(payload));
		} catch {
			// Storage disabled/full — fall through; the form just won't be prefilled.
		}
		goto(`/${target === 'bounty' ? 'bounties' : 'projects'}/create?ai=1`);
	}

	function reset() {
		result = null;
		error = null;
	}
</script>

<div class="mx-auto max-w-3xl space-y-6 px-2 py-6 md:px-0">
	<header>
		<h1 class="text-2xl font-semibold">Post work</h1>
		<p class="text-sm text-zinc-500">Choose how you want to engage freelancers.</p>
	</header>

	{#if data.aiEnabled}
		<Card class="border-zinc-200">
			<CardContent class="space-y-4 py-6">
				<div class="space-y-1">
					<span
						class="bg-forest-soft text-forest inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
					>
						AI assist
					</span>
					<h2 class="text-lg font-semibold">Not sure where to start?</h2>
					<p class="text-sm text-zinc-600">
						Describe what you need in a sentence or two. AI will suggest whether to run a bounty or
						hire a contractor, and draft the brief for you to review and edit.
					</p>
				</div>

				{#if !result}
					<div class="space-y-3">
						<div class="space-y-1.5">
							<Label for="ai-need">What do you need done?</Label>
							<Textarea
								id="ai-need"
								bind:value={need}
								rows={3}
								placeholder="e.g. I need a logo for my new coffee shop, best entry wins."
							/>
						</div>
						<div class="grid gap-3 sm:grid-cols-2">
							<div class="space-y-1.5">
								<Label for="ai-budget">Approximate budget (SLE, optional)</Label>
								<Input
									id="ai-budget"
									bind:value={budget}
									type="number"
									min="0"
									placeholder="e.g. 500"
								/>
							</div>
							<div class="space-y-1.5">
								<Label for="ai-timeline">Timeline (optional)</Label>
								<Input id="ai-timeline" bind:value={timeline} placeholder="e.g. within 2 weeks" />
							</div>
						</div>
						{#if error}
							<p class="text-sm text-red-600">{error}</p>
						{/if}
						<Button onclick={askAi} disabled={loading}>
							{loading ? 'Thinking…' : 'Ask AI to draft this'}
						</Button>
					</div>
				{:else}
					{@const decided = result.type === 'BOUNTY' ? 'bounty' : 'project'}
					{@const other = decided === 'bounty' ? 'project' : 'bounty'}
					<div class="space-y-4">
						<div class="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
							<div class="flex items-center gap-2">
								<span class="text-sm text-zinc-500">AI suggests:</span>
								<Badge>{result.type}</Badge>
							</div>
							<p class="text-sm text-zinc-700">{result.reasoning}</p>
							<p class="text-sm font-medium text-zinc-900">{result.draft.title}</p>
						</div>
						<div class="flex flex-wrap gap-2">
							<Button onclick={() => useDraft(decided)}>Use this draft →</Button>
							<Button variant="outline" onclick={() => useDraft(other)}>
								Make a {other === 'bounty' ? 'bounty' : 'project'} instead
							</Button>
							<Button variant="ghost" onclick={reset}>Start over</Button>
						</div>
						<p class="text-xs text-zinc-500">
							You'll be taken to the create form, prefilled and fully editable. Nothing is posted
							until you submit it yourself.
						</p>
					</div>
				{/if}
			</CardContent>
		</Card>

		<div class="flex items-center gap-3">
			<Separator class="flex-1" />
			<span class="text-xs tracking-wide text-zinc-400 uppercase">or choose yourself</span>
			<Separator class="flex-1" />
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		<a href="/bounties/create" class="block">
			<Card class="h-full transition-colors hover:border-zinc-900">
				<CardContent class="space-y-2 py-6">
					<span
						class="bg-terracotta-soft text-clay inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
					>
						Bounty
					</span>
					<h2 class="text-lg font-semibold">Run a competition</h2>
					<p class="text-sm text-zinc-600">
						Post a prize, many freelancers submit work, and you pick the winners. Best for one-off
						deliverables with a fixed or open reward.
					</p>
				</CardContent>
			</Card>
		</a>

		<a href="/projects/create" class="block">
			<Card class="h-full transition-colors hover:border-zinc-900">
				<CardContent class="space-y-2 py-6">
					<span
						class="bg-forest-soft text-forest inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
					>
						Project
					</span>
					<h2 class="text-lg font-semibold">Hire one contractor</h2>
					<p class="text-sm text-zinc-600">
						Set a budget, freelancers apply with a milestone proposal, and you award one. Work is
						delivered and paid milestone by milestone from escrow.
					</p>
				</CardContent>
			</Card>
		</a>
	</div>
</div>
