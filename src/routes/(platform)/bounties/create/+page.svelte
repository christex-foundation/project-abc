<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import RichTextEditor from '$lib/components/editor/RichTextEditor.svelte';
	import { useLocalDraft } from '$lib/hooks/useLocalDraft';
	import {
		Button,
		Input,
		Label,
		Textarea,
		Card,
		CardHeader,
		CardTitle,
		CardContent,
		Badge,
		Separator
	} from '$lib/components/ui';
	import { createBountyInput } from '$lib/validators/bounty';

	let { data } = $props();

	type Tier = { position: number; amount: number; label?: string };
	type SkillSel = { skillId: string; isRequired: boolean };
	type Question = { question: string; optional: boolean };

	// Bounties only — Projects have their own flow at /projects/create.
	type Draft = {
		step: number;
		title: string;
		description: string;
		requirements: string;
		deliverables: string;
		skills: SkillSel[];
		compensationType: 'FIXED' | 'RANGE' | 'VARIABLE' | '';
		currency: string;
		totalPrizePool: number | '';
		minRewardAsk: number | '';
		maxRewardAsk: number | '';
		numberOfWinners: number;
		maxBonusSpots: number;
		prizeTiers: Tier[];
		eligibility: Question[];
		timeToComplete: string;
		submissionDeadline: string;
		judgingDeadline: string;
	};

	const initial: Draft = {
		step: 1,
		title: '',
		description: '',
		requirements: '',
		deliverables: '',
		skills: [],
		compensationType: '',
		currency: 'SLE',
		totalPrizePool: '',
		minRewardAsk: '',
		maxRewardAsk: '',
		numberOfWinners: 1,
		maxBonusSpots: 0,
		prizeTiers: [],
		eligibility: [],
		timeToComplete: '',
		submissionDeadline: '',
		judgingDeadline: ''
	};

	const steps = ['Info', 'Skills', 'Compensation', 'Prizes', 'Eligibility', 'Timeline', 'Review'];

	// v2: the wizard is bounty-only now; old drafts carried a Type step + project
	// fields, so use a fresh key to avoid restoring an incompatible shape.
	const draftStore = useLocalDraft<Draft>('bounty-create-wizard-v2');
	let d = $state<Draft>(initial);
	let restorePrompt = $state(false);
	// Bumped on restore to force the (uncontrolled, read-once) editors to remount
	// and re-read their `initialHTML` from the restored draft.
	let editorNonce = $state(0);
	// Serialised pristine state; autosave is suppressed while `d` matches it so the
	// effect can't clobber a stored draft before the user has edited (or resumed) it.
	const pristine = JSON.stringify(initial);

	onMount(() => {
		const saved = draftStore.load();
		if (saved) restorePrompt = true;
	});

	function restore() {
		const saved = draftStore.load();
		if (saved) {
			// Clamp step into the current range in case of an older saved draft.
			saved.step = Math.min(Math.max(1, saved.step ?? 1), steps.length);
			d = saved;
		}
		restorePrompt = false;
		editorNonce++;
	}
	function discard() {
		draftStore.clear();
		restorePrompt = false;
	}

	// Auto-save on every change, but never while still pristine (would clobber a
	// stored draft before the user resumes it).
	$effect(() => {
		const cur = JSON.stringify(d);
		if (cur !== pristine) draftStore.save(d);
	});

	let stepError = $state<string | null>(null);

	function canAdvance(): string | null {
		if (d.step === 1) {
			if (d.title.trim().length < 5) return 'Title must be at least 5 characters.';
			if (!d.description || d.description.replace(/<[^>]*>/g, '').trim().length === 0)
				return 'Description is required.';
		}
		if (d.step === 3 && !d.compensationType) return 'Pick a compensation type.';
		if (d.step === 4 && d.compensationType === 'FIXED') {
			const regular = d.prizeTiers.filter((t) => t.position !== 99);
			const wanted = Array.from({ length: d.numberOfWinners }, (_, i) => i + 1);
			const positions = regular.map((t) => t.position).sort((a, b) => a - b);
			if (positions.length !== wanted.length || !wanted.every((p, i) => positions[i] === p))
				return `Define tiers for positions 1..${d.numberOfWinners}.`;
		}
		if (d.step === 6) {
			if (!d.submissionDeadline) return 'Submission deadline is required.';
			if (new Date(d.submissionDeadline).getTime() <= Date.now())
				return 'Deadline must be in the future.';
		}
		return null;
	}

	function syncTiers() {
		// Keep prizeTiers consistent with numberOfWinners + maxBonusSpots so the
		// user never sees stale rows from a previous selection.
		if (d.compensationType !== 'FIXED') return;
		const bonus = d.prizeTiers.find((t) => t.position === 99);
		const regular: typeof d.prizeTiers = [];
		for (let i = 1; i <= d.numberOfWinners; i++) {
			const existing = d.prizeTiers.find((t) => t.position === i);
			regular.push(existing ? { ...existing, position: i } : { position: i, amount: 0 });
		}
		d.prizeTiers = bonus && d.maxBonusSpots > 0 ? [...regular, bonus] : regular;
	}

	function next() {
		stepError = canAdvance();
		if (stepError) return;
		if (d.step === 3) syncTiers();
		d.step += 1;
	}
	function back() {
		stepError = null;
		if (d.step > 1) d.step -= 1;
	}

	function toggleSkill(id: string) {
		const idx = d.skills.findIndex((s) => s.skillId === id);
		if (idx >= 0) d.skills.splice(idx, 1);
		else d.skills.push({ skillId: id, isRequired: false });
	}
	function setSkillRequired(id: string, req: boolean) {
		const s = d.skills.find((x) => x.skillId === id);
		if (s) s.isRequired = req;
	}

	function addBonusTier() {
		if (d.prizeTiers.some((t) => t.position === 99)) return;
		d.prizeTiers = [...d.prizeTiers, { position: 99, amount: 0, label: 'Bonus' }];
	}
	function removeBonusTier() {
		d.prizeTiers = d.prizeTiers.filter((t) => t.position !== 99);
	}

	function addQuestion() {
		d.eligibility = [...d.eligibility, { question: '', optional: false }];
	}
	function removeQuestion(i: number) {
		d.eligibility = d.eligibility.filter((_, idx) => idx !== i);
	}

	function totalMinorFromTiers(): number {
		const regularSum = d.prizeTiers
			.filter((t) => t.position !== 99)
			.reduce((s, t) => s + Number(t.amount || 0), 0);
		const bonusSum = d.prizeTiers
			.filter((t) => t.position === 99)
			.reduce((s, t) => s + Number(t.amount || 0) * d.maxBonusSpots, 0);
		return regularSum + bonusSum;
	}

	function alignTotal() {
		if (d.compensationType === 'FIXED') d.totalPrizePool = totalMinorFromTiers();
	}

	let submitting = $state(false);
	let submitError = $state<string | null>(null);

	async function submit() {
		stepError = canAdvance();
		if (stepError) return;
		submitting = true;
		submitError = null;
		try {
			const payload = {
				title: d.title,
				description: d.description,
				requirements: d.requirements || null,
				deliverables: d.deliverables || null,
				type: 'BOUNTY' as const,
				compensationType: d.compensationType,
				currency: d.currency,
				totalPrizePool: Number(d.totalPrizePool || 0),
				minRewardAsk: d.minRewardAsk === '' ? null : Number(d.minRewardAsk),
				maxRewardAsk: d.maxRewardAsk === '' ? null : Number(d.maxRewardAsk),
				numberOfWinners: d.numberOfWinners,
				maxBonusSpots: d.maxBonusSpots,
				prizeTiers: d.prizeTiers,
				skills: d.skills,
				eligibility: d.eligibility,
				timeToComplete: d.timeToComplete || null,
				submissionDeadline: new Date(d.submissionDeadline).toISOString(),
				judgingDeadline: d.judgingDeadline ? new Date(d.judgingDeadline).toISOString() : null
			};

			// Client-side parse for early feedback.
			const parsed = createBountyInput.safeParse(payload);
			if (!parsed.success) {
				submitError = parsed.error.issues[0]?.message ?? 'Validation failed.';
				submitting = false;
				return;
			}

			const res = await fetch('/api/bounties', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				submitError = body?.error?.message ?? 'Failed to create bounty.';
				submitting = false;
				return;
			}
			draftStore.clear();
			await goto('/dashboard/company/bounties');
		} catch (e) {
			submitError = (e as Error).message;
			submitting = false;
		}
	}

	function formatMoney(minor: number) {
		return `${d.currency} ${(minor / 100).toLocaleString()}`;
	}
</script>

<div class="space-y-6 px-2 py-4 md:px-0">
	<header class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<a href="/create" class="text-sm text-zinc-500 hover:underline">&larr; Choose type</a>
			<h1 class="text-2xl font-semibold">Create a bounty</h1>
			<p class="text-sm text-zinc-500">Step {d.step} of {steps.length} — {steps[d.step - 1]}</p>
		</div>
		<ol class="hidden gap-1 md:flex">
			{#each steps as label, i (i)}
				<li
					class={`rounded-full px-2 py-0.5 text-xs ${
						d.step === i + 1
							? 'bg-zinc-900 text-white'
							: d.step > i + 1
								? 'bg-emerald-100 text-emerald-900'
								: 'bg-zinc-100 text-zinc-500'
					}`}
				>
					{i + 1}. {label}
				</li>
			{/each}
		</ol>
	</header>

	{#if restorePrompt}
		<Card>
			<CardContent class="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
				<p class="text-sm">You have an unsaved draft from a previous session. Resume it?</p>
				<div class="flex gap-2">
					<Button size="sm" onclick={restore}>Resume draft</Button>
					<Button size="sm" variant="ghost" onclick={discard}>Discard</Button>
				</div>
			</CardContent>
		</Card>
	{/if}

	{#if d.step === 1}
		<Card>
			<CardHeader><CardTitle>Title and description</CardTitle></CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-1">
					<Label for="title">Title</Label>
					<Input id="title" bind:value={d.title} placeholder="Build a USSD-based airtime top-up" />
				</div>
				{#key editorNonce}
					<div class="space-y-1">
						<Label for="desc">Description</Label>
						<RichTextEditor
							initialHTML={d.description}
							placeholder="What is this bounty? Who is it for?"
							onChange={(html) => (d.description = html)}
						/>
					</div>
					<div class="space-y-1">
						<Label for="req">Requirements (optional)</Label>
						<RichTextEditor
							initialHTML={d.requirements}
							placeholder="Acceptance criteria, must-haves…"
							onChange={(html) => (d.requirements = html)}
						/>
					</div>
					<div class="space-y-1">
						<Label for="del">Deliverables (optional)</Label>
						<RichTextEditor
							initialHTML={d.deliverables}
							placeholder="What artifacts do winners submit?"
							onChange={(html) => (d.deliverables = html)}
						/>
					</div>
				{/key}
			</CardContent>
		</Card>
	{/if}

	{#if d.step === 2}
		<Card>
			<CardHeader><CardTitle>Skills</CardTitle></CardHeader>
			<CardContent class="space-y-4">
				<p class="text-sm text-zinc-500">
					Pick the skills relevant to this work. Toggle "required" for the ones a freelancer must
					have.
				</p>
				<div class="space-y-3">
					{#each data.categories as cat (cat.id)}
						<details open>
							<summary class="cursor-pointer text-sm font-medium">{cat.name}</summary>
							<div class="mt-2 grid gap-2 sm:grid-cols-2">
								{#each cat.skills as s (s.id)}
									{@const sel = d.skills.find((x) => x.skillId === s.id)}
									<div class="flex items-center justify-between rounded border px-3 py-2 text-sm">
										<label class="flex items-center gap-2">
											<input
												type="checkbox"
												checked={!!sel}
												onchange={() => toggleSkill(s.id)}
												class="h-4 w-4 rounded border-zinc-300"
											/>
											<span>{s.name}</span>
										</label>
										{#if sel}
											<label class="flex items-center gap-1 text-xs text-zinc-500">
												<input
													type="checkbox"
													checked={sel.isRequired}
													onchange={(e) =>
														setSkillRequired(s.id, (e.target as HTMLInputElement).checked)}
												/>
												required
											</label>
										{/if}
									</div>
								{/each}
							</div>
						</details>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}

	{#if d.step === 3}
		<Card>
			<CardHeader><CardTitle>Compensation</CardTitle></CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<label class="flex cursor-pointer items-start gap-3 rounded border p-3 hover:bg-zinc-50">
						<input
							type="radio"
							name="ct"
							value="FIXED"
							bind:group={d.compensationType}
							class="mt-1"
						/>
						<div>
							<div class="font-medium">Fixed</div>
							<div class="text-sm text-zinc-500">
								Set prize amounts for each winning position. Total escrowed up front.
							</div>
						</div>
					</label>
					<label class="flex cursor-pointer items-start gap-3 rounded border p-3 hover:bg-zinc-50">
						<input
							type="radio"
							name="ct"
							value="RANGE"
							bind:group={d.compensationType}
							class="mt-1"
						/>
						<div>
							<div class="font-medium">Range</div>
							<div class="text-sm text-zinc-500">
								Define min / max; freelancers propose an ask within the range.
							</div>
						</div>
					</label>
					<label class="flex cursor-pointer items-start gap-3 rounded border p-3 hover:bg-zinc-50">
						<input
							type="radio"
							name="ct"
							value="VARIABLE"
							bind:group={d.compensationType}
							class="mt-1"
						/>
						<div>
							<div class="font-medium">Variable</div>
							<div class="text-sm text-zinc-500">Freelancer proposes the price.</div>
						</div>
					</label>
				</div>

				<Separator />
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<Label for="winners">Number of winners</Label>
						<Input id="winners" type="number" min="1" bind:value={d.numberOfWinners} />
					</div>
					<div class="space-y-1">
						<Label for="bonus">Max bonus spots</Label>
						<Input id="bonus" type="number" min="0" bind:value={d.maxBonusSpots} />
					</div>
				</div>

				{#if d.compensationType === 'RANGE'}
					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-1">
							<Label for="minA">Min ask (SLE, minor)</Label>
							<Input id="minA" type="number" bind:value={d.minRewardAsk} />
						</div>
						<div class="space-y-1">
							<Label for="maxA">Max ask (SLE, minor)</Label>
							<Input id="maxA" type="number" bind:value={d.maxRewardAsk} />
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}

	{#if d.step === 4}
		<Card>
			<CardHeader><CardTitle>Prize tiers</CardTitle></CardHeader>
			<CardContent class="space-y-3">
				{#if d.compensationType !== 'FIXED'}
					<p class="text-sm text-zinc-500">
						No tier editing needed for {d.compensationType.toLowerCase()} compensation.
					</p>
				{:else}
					<p class="text-xs text-zinc-500">Amounts in minor units (SLE × 100).</p>
					{#each d.prizeTiers.filter((t) => t.position !== 99) as tier, i (tier.position)}
						<div class="flex items-center gap-2">
							<span class="w-16 text-sm">#{tier.position}</span>
							<Input
								type="number"
								bind:value={d.prizeTiers[d.prizeTiers.indexOf(tier)].amount}
								oninput={alignTotal}
							/>
							<Input
								placeholder="Label (optional)"
								bind:value={d.prizeTiers[d.prizeTiers.indexOf(tier)].label as string}
							/>
						</div>
					{/each}

					<Separator />
					{#if d.prizeTiers.some((t) => t.position === 99)}
						{@const bt = d.prizeTiers.find((t) => t.position === 99)!}
						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<Badge variant="secondary">Bonus (×{d.maxBonusSpots})</Badge>
								<Input
									type="number"
									bind:value={d.prizeTiers[d.prizeTiers.indexOf(bt)].amount}
									oninput={alignTotal}
								/>
								<Button size="sm" variant="ghost" onclick={removeBonusTier}>Remove bonus</Button>
							</div>
						</div>
					{:else if d.maxBonusSpots > 0}
						<Button size="sm" variant="secondary" onclick={addBonusTier}>+ Add bonus tier</Button>
					{/if}

					<Separator />
					<div class="flex items-center justify-between text-sm">
						<span class="font-medium">Total prize pool</span>
						<span>{formatMoney(totalMinorFromTiers())}</span>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}

	{#if d.step === 5}
		<Card>
			<CardHeader><CardTitle>Eligibility questions</CardTitle></CardHeader>
			<CardContent class="space-y-3">
				<p class="text-sm text-zinc-500">
					Optional questions that submitters will answer during submission.
				</p>
				{#each d.eligibility as q, i (i)}
					<div class="flex items-start gap-2">
						<Textarea
							rows={2}
							bind:value={d.eligibility[i].question}
							placeholder="e.g., Share a link to a similar past project."
						/>
						<label class="flex shrink-0 items-center gap-1 text-xs">
							<input type="checkbox" bind:checked={d.eligibility[i].optional} />
							optional
						</label>
						<Button size="sm" variant="ghost" onclick={() => removeQuestion(i)}>Remove</Button>
					</div>
				{/each}
				<Button size="sm" variant="secondary" onclick={addQuestion}>+ Add question</Button>
			</CardContent>
		</Card>
	{/if}

	{#if d.step === 6}
		<Card>
			<CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
			<CardContent class="space-y-3">
				<div class="space-y-1">
					<Label for="sd">Submission deadline</Label>
					<Input id="sd" type="datetime-local" bind:value={d.submissionDeadline} />
				</div>
				<div class="space-y-1">
					<Label for="jd">Judging deadline (optional)</Label>
					<Input id="jd" type="datetime-local" bind:value={d.judgingDeadline} />
				</div>
			</CardContent>
		</Card>
	{/if}

	{#if d.step === 7}
		<Card>
			<CardHeader><CardTitle>Review</CardTitle></CardHeader>
			<CardContent class="space-y-4 text-sm">
				<div><span class="font-medium">Title:</span> {d.title}</div>
				<div>
					<span class="font-medium">Compensation:</span>
					{d.compensationType} ({d.currency})
				</div>
				{#if d.compensationType === 'FIXED'}
					<div>
						<span class="font-medium">Total pool:</span>
						{formatMoney(totalMinorFromTiers())}
					</div>
				{/if}
				<div><span class="font-medium">Skills:</span> {d.skills.length} selected</div>
				<div><span class="font-medium">Eligibility questions:</span> {d.eligibility.length}</div>
				<div><span class="font-medium">Submission deadline:</span> {d.submissionDeadline}</div>
				{#if submitError}<p class="text-sm text-red-600">{submitError}</p>{/if}
				<Button onclick={submit} disabled={submitting} class="w-full">
					{submitting ? 'Saving…' : 'Create draft'}
				</Button>
				<p class="text-xs text-zinc-500">Drafts are private until you fund and publish them.</p>
			</CardContent>
		</Card>
	{/if}

	{#if stepError}
		<p class="text-sm text-red-600">{stepError}</p>
	{/if}

	<div class="flex justify-between">
		<Button variant="ghost" onclick={back} disabled={d.step === 1}>Back</Button>
		{#if d.step < steps.length}
			<Button onclick={next}>Next</Button>
		{/if}
	</div>
</div>
