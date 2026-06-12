<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import RichTextEditor from '$lib/components/editor/LazyRichTextEditor.svelte';
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
	import {
		PROVINCES,
		PROVINCE_LABEL,
		DISTRICT_LABEL,
		districtsForProvince,
		type Province,
		type District
	} from '$lib/constants/geo';
	import { minorToMajor, majorToMinor } from '$lib/utils';

	type SkillCategory = { id: string; name: string; skills: { id: string; name: string }[] };
	type Tier = { position: number; amount: number; label?: string };
	type SkillSel = { skillId: string; isRequired: boolean };
	type Question = { question: string; optional: boolean };

	// Content fields only — `step` is internal wizard state, never part of `initial`.
	type Initial = {
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
		targetProvinces: Province[];
		/** Districts refine the provincial lock; each must belong to a chosen province. */
		targetDistricts: District[];
		/** Always blank in edit mode — the stored PIN hash is never read back. */
		accessPin: string;
	};

	type Draft = Initial & { step: number };

	type Props = {
		categories: SkillCategory[];
		/** When set, the form edits an existing bounty (PATCH) instead of creating. */
		bountyId?: string;
		initial?: Initial;
		/** Whether the edited bounty already has a PIN set (edit mode hint). */
		isPinLocked?: boolean;
		/** localStorage draft key; omit to disable draft autosave (edit mode). */
		draftKey?: string;
		submitLabel?: string;
		redirectTo?: string;
	};

	let {
		categories,
		bountyId,
		initial,
		isPinLocked = false,
		draftKey,
		submitLabel = 'Create draft',
		redirectTo = '/dashboard/company/bounties'
	}: Props = $props();

	const blank: Initial = {
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
		judgingDeadline: '',
		targetProvinces: [],
		targetDistricts: [],
		accessPin: ''
	};

	const steps = [
		'Info',
		'Skills',
		'Compensation',
		'Prizes',
		'Eligibility',
		'Timeline',
		'Region',
		'Review'
	];

	// `initial` (edit mode) arrives in minor units; the form edits amounts in
	// major-unit Leones, so convert on the way in. Create mode passes `blank`
	// (empty strings / []) which round-trips through this untouched. Autosaved and
	// AI-seeded drafts are already stored in major units, so they skip this.
	function toMajorInitial(init: Initial): Initial {
		return {
			...init,
			totalPrizePool: init.totalPrizePool === '' ? '' : minorToMajor(init.totalPrizePool),
			minRewardAsk: init.minRewardAsk === '' ? '' : minorToMajor(init.minRewardAsk),
			maxRewardAsk: init.maxRewardAsk === '' ? '' : minorToMajor(init.maxRewardAsk),
			prizeTiers: init.prizeTiers.map((t) => ({ ...t, amount: minorToMajor(t.amount) }))
		};
	}
	const seed: Initial = untrack(() => toMajorInitial(initial ?? blank));

	let d = $state<Draft>(untrack(() => ({ ...structuredClone(seed), step: 1 })));
	let restorePrompt = $state(false);
	// Bumped on restore to force the (uncontrolled, read-once) editors to remount
	// and re-read their `initialHTML` from the restored draft.
	let editorNonce = $state(0);

	const draftStore = untrack(() => (draftKey ? useLocalDraft<Draft>(draftKey) : null));
	// Serialised pristine state; autosave is suppressed while `d` matches it so the
	// effect can't clobber a stored draft before the user has edited (or resumed) it.
	const pristine = untrack(() => JSON.stringify({ ...seed, step: 1 }));

	onMount(() => {
		const saved = draftStore?.load();
		if (!saved) return;
		// Arriving from the AI decider (/create?ai=1): apply the seeded draft
		// directly and remount the editors, skipping the restore prompt. Drop the
		// query param so a later refresh falls back to the normal restore flow.
		if (new URLSearchParams(window.location.search).get('ai') === '1') {
			saved.step = Math.min(Math.max(1, saved.step ?? 1), steps.length);
			// AI-built drafts may omit access fields; merge onto `blank` so arrays/PIN
			// are never undefined.
			d = { ...blank, ...saved };
			editorNonce++;
			history.replaceState({}, '', window.location.pathname);
			return;
		}
		restorePrompt = true;
	});

	function restore() {
		const saved = draftStore?.load();
		if (saved) {
			// Clamp step into the current range in case of an older saved draft.
			saved.step = Math.min(Math.max(1, saved.step ?? 1), steps.length);
			d = { ...blank, ...saved };
		}
		restorePrompt = false;
		editorNonce++;
	}
	function discard() {
		draftStore?.clear();
		restorePrompt = false;
	}

	// Auto-save on every change, but never while still pristine (would clobber a
	// stored draft before the user resumes it).
	$effect(() => {
		const cur = JSON.stringify(d);
		if (cur !== pristine) draftStore?.save(d);
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
		if (d.step === 7 && d.accessPin.trim() && !/^[A-Za-z0-9]{4,8}$/.test(d.accessPin.trim()))
			return 'PIN must be 4–8 letters or numbers.';
		return null;
	}

	function toggleProvince(p: Province) {
		d.targetProvinces = d.targetProvinces.includes(p)
			? d.targetProvinces.filter((x) => x !== p)
			: [...d.targetProvinces, p];
	}

	function toggleDistrict(dist: District) {
		d.targetDistricts = d.targetDistricts.includes(dist)
			? d.targetDistricts.filter((x) => x !== dist)
			: [...d.targetDistricts, dist];
	}

	// Prune any selected district whose province is no longer checked.
	$effect(() => {
		const allowed = new Set(d.targetProvinces.flatMap(districtsForProvince));
		if (d.targetDistricts.some((x) => !allowed.has(x))) {
			d.targetDistricts = d.targetDistricts.filter((x) => allowed.has(x));
		}
	});

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

	// Sum of tier amounts, in major-unit Leones (the unit the inputs hold).
	function totalFromTiers(): number {
		const regularSum = d.prizeTiers
			.filter((t) => t.position !== 99)
			.reduce((s, t) => s + Number(t.amount || 0), 0);
		const bonusSum = d.prizeTiers
			.filter((t) => t.position === 99)
			.reduce((s, t) => s + Number(t.amount || 0) * d.maxBonusSpots, 0);
		return regularSum + bonusSum;
	}

	function alignTotal() {
		if (d.compensationType === 'FIXED') d.totalPrizePool = totalFromTiers();
	}

	let submitting = $state(false);
	let submitError = $state<string | null>(null);

	async function submit() {
		stepError = canAdvance();
		if (stepError) return;
		submitting = true;
		submitError = null;
		try {
			const pin = d.accessPin.trim();
			// Inputs hold major-unit Leones; convert to minor units for storage. Convert
			// the tiers once, then derive the FIXED total from those SAME minor values so
			// it always equals the validator's tier-sum check — summing-then-rounding and
			// rounding-then-summing can otherwise drift by a cent on odd inputs.
			const minorTiers = d.prizeTiers.map((t) => ({
				...t,
				amount: majorToMinor(Number(t.amount || 0))
			}));
			const totalPrizePoolMinor =
				d.compensationType === 'FIXED'
					? minorTiers.filter((t) => t.position !== 99).reduce((s, t) => s + t.amount, 0) +
						minorTiers
							.filter((t) => t.position === 99)
							.reduce((s, t) => s + t.amount * d.maxBonusSpots, 0)
					: majorToMinor(Number(d.totalPrizePool || 0));
			const payload: Record<string, unknown> = {
				title: d.title,
				description: d.description,
				requirements: d.requirements || null,
				deliverables: d.deliverables || null,
				type: 'BOUNTY' as const,
				compensationType: d.compensationType,
				currency: d.currency,
				totalPrizePool: totalPrizePoolMinor,
				minRewardAsk: d.minRewardAsk === '' ? null : majorToMinor(Number(d.minRewardAsk)),
				maxRewardAsk: d.maxRewardAsk === '' ? null : majorToMinor(Number(d.maxRewardAsk)),
				numberOfWinners: d.numberOfWinners,
				maxBonusSpots: d.maxBonusSpots,
				prizeTiers: minorTiers,
				skills: d.skills,
				eligibility: d.eligibility,
				timeToComplete: d.timeToComplete || null,
				submissionDeadline: new Date(d.submissionDeadline).toISOString(),
				judgingDeadline: d.judgingDeadline ? new Date(d.judgingDeadline).toISOString() : null,
				targetProvinces: d.targetProvinces,
				targetDistricts: d.targetDistricts
			};

			// PIN directive: on create, always send (set or null). On edit, omit the
			// key when left blank so the existing PIN is preserved; send a value to
			// change it.
			if (bountyId) {
				if (pin) payload.accessPin = pin;
			} else {
				payload.accessPin = pin || null;
			}

			// Client-side parse for early feedback.
			const parsed = createBountyInput.safeParse(payload);
			if (!parsed.success) {
				submitError = parsed.error.issues[0]?.message ?? 'Validation failed.';
				submitting = false;
				return;
			}

			const url = bountyId ? `/api/bounties/${bountyId}` : '/api/bounties';
			const method = bountyId ? 'PATCH' : 'POST';
			const res = await fetch(url, {
				method,
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				submitError = body?.error?.message ?? 'Failed to save bounty.';
				submitting = false;
				return;
			}
			draftStore?.clear();
			await goto(redirectTo);
		} catch (e) {
			submitError = (e as Error).message;
			submitting = false;
		}
	}

	// `major` is already in Leones (inputs hold major units) — format, don't divide.
	function formatMoney(major: number) {
		return `${d.currency} ${major.toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		})}`;
	}
</script>

<div class="space-y-6">
	<p class="text-ink-soft font-mono text-xs tracking-wide uppercase">
		Step {d.step} of {steps.length} · {steps[d.step - 1]}
	</p>
	<ol class="hidden flex-wrap gap-1 md:flex">
		{#each steps as label, i (i)}
			<li
				class={`rounded-full px-2 py-0.5 font-mono text-xs ${
					d.step === i + 1
						? 'bg-terracotta text-cream'
						: d.step > i + 1
							? 'bg-forest-soft text-forest'
							: 'bg-paper text-ink-soft'
				}`}
			>
				{i + 1}. {label}
			</li>
		{/each}
	</ol>

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
				<p class="text-ink-soft text-sm">
					Pick the skills relevant to this work. Toggle "required" for the ones a freelancer must
					have.
				</p>
				<div class="space-y-3">
					{#each categories as cat (cat.id)}
						<details open>
							<summary class="text-ink cursor-pointer text-sm font-medium">{cat.name}</summary>
							<div class="mt-2 grid gap-2 sm:grid-cols-2">
								{#each cat.skills as s (s.id)}
									{@const sel = d.skills.find((x) => x.skillId === s.id)}
									<div
										class="border-bone text-ink flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
									>
										<label class="flex items-center gap-2">
											<input
												type="checkbox"
												checked={!!sel}
												onchange={() => toggleSkill(s.id)}
												class="border-bone text-terracotta h-4 w-4 rounded"
											/>
											<span>{s.name}</span>
										</label>
										{#if sel}
											<label class="text-ink-soft flex items-center gap-1 text-xs">
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
					<label
						class="border-bone hover:bg-paper flex cursor-pointer items-start gap-3 rounded-xl border p-3"
					>
						<input
							type="radio"
							name="ct"
							value="FIXED"
							bind:group={d.compensationType}
							class="accent-terracotta mt-1"
						/>
						<div>
							<div class="text-ink font-medium">Fixed</div>
							<div class="text-ink-soft text-sm">
								Set prize amounts for each winning position. Total escrowed up front.
							</div>
						</div>
					</label>
					<label
						class="border-bone hover:bg-paper flex cursor-pointer items-start gap-3 rounded-xl border p-3"
					>
						<input
							type="radio"
							name="ct"
							value="RANGE"
							bind:group={d.compensationType}
							class="accent-terracotta mt-1"
						/>
						<div>
							<div class="text-ink font-medium">Range</div>
							<div class="text-ink-soft text-sm">
								Define a min and max; freelancers propose an ask within the range.
							</div>
						</div>
					</label>
					<label
						class="border-bone hover:bg-paper flex cursor-pointer items-start gap-3 rounded-xl border p-3"
					>
						<input
							type="radio"
							name="ct"
							value="VARIABLE"
							bind:group={d.compensationType}
							class="accent-terracotta mt-1"
						/>
						<div>
							<div class="text-ink font-medium">Variable</div>
							<div class="text-ink-soft text-sm">Freelancer proposes the price.</div>
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
							<Label for="minA">Min ask (SLE)</Label>
							<Input id="minA" type="number" min="0" step="0.01" bind:value={d.minRewardAsk} />
						</div>
						<div class="space-y-1">
							<Label for="maxA">Max ask (SLE)</Label>
							<Input id="maxA" type="number" min="0" step="0.01" bind:value={d.maxRewardAsk} />
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
					<p class="text-ink-soft text-sm">
						No tier editing needed for {d.compensationType.toLowerCase()} compensation.
					</p>
				{:else}
					<p class="text-ink-soft text-xs">Amounts in Leones (SLE).</p>
					{#each d.prizeTiers.filter((t) => t.position !== 99) as tier, i (tier.position)}
						<div class="flex items-center gap-2">
							<span class="w-16 text-sm">#{tier.position}</span>
							<Input
								type="number"
								min="0"
								step="0.01"
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
									min="0"
									step="0.01"
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
						<span>{formatMoney(totalFromTiers())}</span>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}

	{#if d.step === 5}
		<Card>
			<CardHeader><CardTitle>Eligibility questions</CardTitle></CardHeader>
			<CardContent class="space-y-3">
				<p class="text-ink-soft text-sm">Optional questions submitters answer when they submit.</p>
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
			<CardHeader><CardTitle>Region &amp; access</CardTitle></CardHeader>
			<CardContent class="space-y-5">
				<div class="space-y-2">
					<Label>Provinces</Label>
					<p class="text-ink-soft text-sm">
						Leave all unchecked to open this bounty nationwide. Select one or more provinces to
						restrict who can submit — only freelancers in those provinces will be able to enter.
					</p>
					<div class="grid gap-2 sm:grid-cols-2">
						{#each PROVINCES as p (p.value)}
							<label
								class="border-bone hover:bg-paper flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm"
							>
								<input
									type="checkbox"
									checked={d.targetProvinces.includes(p.value)}
									onchange={() => toggleProvince(p.value)}
									class="border-bone text-terracotta h-4 w-4 rounded"
								/>
								<span>{p.label}</span>
							</label>
						{/each}
					</div>
					<p class="text-ink-soft text-xs">
						{d.targetProvinces.length === 0
							? 'Open to all of Sierra Leone.'
							: `Restricted to ${d.targetProvinces.length} province${d.targetProvinces.length === 1 ? '' : 's'}.`}
					</p>
				</div>

				{#if d.targetProvinces.length > 0}
					<div class="space-y-2">
						<Label>Districts (optional)</Label>
						<p class="text-ink-soft text-sm">
							Optionally narrow to districts within the selected provinces; leave blank to include
							the whole province. Only freelancers in a chosen district will be able to enter.
						</p>
						{#each d.targetProvinces as province (province)}
							<div class="space-y-2">
								<p class="text-ink-soft text-xs font-medium">{PROVINCE_LABEL[province]}</p>
								<div class="grid gap-2 sm:grid-cols-2">
									{#each districtsForProvince(province) as dist (dist)}
										<label
											class="border-bone hover:bg-paper flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm"
										>
											<input
												type="checkbox"
												checked={d.targetDistricts.includes(dist)}
												onchange={() => toggleDistrict(dist)}
												class="border-bone text-terracotta h-4 w-4 rounded"
											/>
											<span>{DISTRICT_LABEL[dist]}</span>
										</label>
									{/each}
								</div>
							</div>
						{/each}
						<p class="text-ink-soft text-xs">
							{d.targetDistricts.length === 0
								? 'Open to the whole of each selected province.'
								: `Restricted to ${d.targetDistricts.length} district${d.targetDistricts.length === 1 ? '' : 's'}.`}
						</p>
					</div>
				{/if}

				<Separator />

				<div class="space-y-2">
					<Label for="pin">Access PIN (optional)</Label>
					<p class="text-ink-soft text-sm">
						Set a PIN to keep this bounty private. The brief and submission stay hidden until a
						freelancer enters the PIN you share with them. 4–8 letters or numbers.
					</p>
					{#if bountyId && isPinLocked}
						<p class="text-ink-soft text-xs">
							A PIN is already set. Leave this blank to keep it, or type a new one to change it.
						</p>
					{/if}
					<Input id="pin" bind:value={d.accessPin} maxlength={8} placeholder="e.g. 4827 or apex9" />
				</div>
			</CardContent>
		</Card>
	{/if}

	{#if d.step === 8}
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
						{formatMoney(totalFromTiers())}
					</div>
				{/if}
				<div><span class="font-medium">Skills:</span> {d.skills.length} selected</div>
				<div><span class="font-medium">Eligibility questions:</span> {d.eligibility.length}</div>
				<div>
					<span class="font-medium">Region:</span>
					{d.targetProvinces.length === 0
						? 'Nationwide'
						: d.targetProvinces.map((p) => PROVINCES.find((x) => x.value === p)?.label).join(', ')}
				</div>
				<div>
					<span class="font-medium">Access:</span>
					{d.accessPin.trim()
						? 'PIN-protected'
						: isPinLocked
							? 'PIN-protected (unchanged)'
							: 'Open'}
				</div>
				<div><span class="font-medium">Submission deadline:</span> {d.submissionDeadline}</div>
				{#if submitError}<p class="text-sm text-red-600">{submitError}</p>{/if}
				<Button onclick={submit} disabled={submitting} class="w-full">
					{submitting ? 'Saving…' : submitLabel}
				</Button>
				{#if !bountyId}
					<p class="text-ink-soft text-xs">Drafts stay private until you fund and publish them.</p>
				{/if}
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
