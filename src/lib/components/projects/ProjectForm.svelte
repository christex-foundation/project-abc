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
		Separator
	} from '$lib/components/ui';
	import { createProjectInput } from '$lib/validators/project';

	type SkillCategory = { id: string; name: string; skills: { id: string; name: string }[] };
	type SkillSel = { skillId: string; isRequired: boolean };
	type MilestoneRow = {
		title: string;
		amount: number | '';
		description: string;
		dueInDays: number | '';
	};
	type Initial = {
		title: string;
		description: string;
		requirements: string;
		deliverables: string;
		currency: string;
		timeToComplete: string;
		skills: SkillSel[];
		milestones: MilestoneRow[];
	};

	type Props = {
		categories: SkillCategory[];
		/** When set, the form edits an existing project (PATCH) instead of creating. */
		projectId?: string;
		initial?: Initial;
		/** localStorage draft key; omit to disable draft autosave (edit mode). */
		draftKey?: string;
		submitLabel?: string;
		redirectTo?: string;
	};

	let {
		categories,
		projectId,
		initial,
		draftKey,
		submitLabel = 'Create draft',
		redirectTo = '/dashboard/company/projects'
	}: Props = $props();

	const blank: Initial = {
		title: '',
		description: '',
		requirements: '',
		deliverables: '',
		currency: 'SLE',
		timeToComplete: '',
		skills: [],
		milestones: [{ title: '', amount: '', description: '', dueInDays: '' }]
	};

	let d = $state<Initial>(untrack(() => structuredClone(initial ?? blank)));
	let restorePrompt = $state(false);
	// Bumped on restore to force the (uncontrolled, read-once) editors to remount
	// and re-read their `initialHTML` from the restored draft.
	let editorNonce = $state(0);

	const draftStore = untrack(() => (draftKey ? useLocalDraft<Initial>(draftKey) : null));
	// Serialised pristine state; autosave is suppressed while `d` matches it so the
	// effect can't clobber a stored draft before the user has edited (or resumed) it.
	const pristine = untrack(() => JSON.stringify(initial ?? blank));

	onMount(() => {
		const saved = draftStore?.load();
		if (!saved) return;
		// Arriving from the AI decider (/create?ai=1): apply the seeded draft
		// directly and remount the editors, skipping the restore prompt. Drop the
		// query param so a later refresh falls back to the normal restore flow.
		if (new URLSearchParams(window.location.search).get('ai') === '1') {
			d = saved;
			editorNonce++;
			history.replaceState({}, '', window.location.pathname);
			return;
		}
		restorePrompt = true;
	});

	function restore() {
		const saved = draftStore?.load();
		if (saved) d = saved;
		restorePrompt = false;
		editorNonce++;
	}
	function discard() {
		draftStore?.clear();
		restorePrompt = false;
	}

	$effect(() => {
		const cur = JSON.stringify(d);
		if (cur !== pristine) draftStore?.save(d);
	});

	function toggleSkill(id: string) {
		const idx = d.skills.findIndex((s) => s.skillId === id);
		if (idx >= 0) d.skills.splice(idx, 1);
		else d.skills.push({ skillId: id, isRequired: false });
	}
	function setSkillRequired(id: string, req: boolean) {
		const s = d.skills.find((x) => x.skillId === id);
		if (s) s.isRequired = req;
	}

	function addMilestone() {
		d.milestones = [...d.milestones, { title: '', amount: '', description: '', dueInDays: '' }];
	}
	function removeMilestone(i: number) {
		d.milestones = d.milestones.filter((_, idx) => idx !== i);
	}

	const total = $derived(d.milestones.reduce((s, m) => s + Number(m.amount || 0), 0));

	function formatMoney(minor: number) {
		return `${d.currency} ${(minor / 100).toLocaleString()}`;
	}

	let submitting = $state(false);
	let submitError = $state<string | null>(null);

	async function submit() {
		submitting = true;
		submitError = null;
		try {
			const payload = {
				title: d.title,
				description: d.description,
				requirements: d.requirements || null,
				deliverables: d.deliverables || null,
				currency: d.currency,
				timeToComplete: d.timeToComplete || null,
				skills: d.skills,
				milestones: d.milestones.map((m) => ({
					title: m.title,
					description: m.description || null,
					amount: Number(m.amount || 0),
					dueInDays: m.dueInDays === '' ? null : Number(m.dueInDays)
				}))
			};

			const parsed = createProjectInput.safeParse(payload);
			if (!parsed.success) {
				submitError = parsed.error.issues[0]?.message ?? 'Validation failed.';
				submitting = false;
				return;
			}

			const url = projectId ? `/api/projects/${projectId}` : '/api/projects';
			const method = projectId ? 'PATCH' : 'POST';
			const res = await fetch(url, {
				method,
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				submitError = body?.error?.message ?? 'Failed to save project.';
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
</script>

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

<Card>
	<CardHeader><CardTitle>Title and scope</CardTitle></CardHeader>
	<CardContent class="space-y-4">
		<div class="space-y-1">
			<Label for="title">Title</Label>
			<Input id="title" bind:value={d.title} placeholder="Build a REST API for our booking site" />
		</div>
		{#key editorNonce}
			<div class="space-y-1">
				<Label for="desc">Overview</Label>
				<RichTextEditor
					initialHTML={d.description}
					placeholder="What needs building? Context, goals, constraints…"
					onChange={(html) => (d.description = html)}
				/>
			</div>
			<div class="space-y-1">
				<Label for="req">Requirements (optional)</Label>
				<RichTextEditor
					initialHTML={d.requirements}
					placeholder="Acceptance criteria, must-haves, tech stack…"
					onChange={(html) => (d.requirements = html)}
				/>
			</div>
			<div class="space-y-1">
				<Label for="del">Deliverables (optional)</Label>
				<RichTextEditor
					initialHTML={d.deliverables}
					placeholder="What gets handed over at the end?"
					onChange={(html) => (d.deliverables = html)}
				/>
			</div>
		{/key}
		<div class="space-y-1 sm:max-w-xs">
			<Label for="ttc">Expected duration (optional)</Label>
			<Input id="ttc" bind:value={d.timeToComplete} placeholder="e.g. 6 weeks" />
		</div>
	</CardContent>
</Card>

<Card>
	<CardHeader><CardTitle>Milestones</CardTitle></CardHeader>
	<CardContent class="space-y-4">
		<p class="text-ink-soft text-xs">
			Define the deliverables and payment for each stage. Amounts in minor units (SLE × 100). Each
			milestone is escrowed up front and released when you approve it.
		</p>
		{#each d.milestones as _m, i (i)}
			<div class="border-bone bg-paper space-y-2 rounded-xl border p-3">
				<div class="flex items-center justify-between">
					<span class="text-ink text-sm font-medium">Milestone {i + 1}</span>
					{#if d.milestones.length > 1}
						<Button size="sm" variant="ghost" onclick={() => removeMilestone(i)}>Remove</Button>
					{/if}
				</div>
				<div class="grid gap-2 sm:grid-cols-[1fr_140px_120px]">
					<Input bind:value={d.milestones[i].title} placeholder="Milestone title" />
					<Input type="number" bind:value={d.milestones[i].amount} placeholder="Amount" />
					<Input type="number" bind:value={d.milestones[i].dueInDays} placeholder="Days" />
				</div>
				<Textarea
					rows={2}
					bind:value={d.milestones[i].description}
					placeholder="What's delivered in this milestone? (optional)"
				/>
			</div>
		{/each}
		<Button size="sm" variant="secondary" onclick={addMilestone}>+ Add milestone</Button>

		<Separator />
		<div class="flex items-center justify-between text-sm">
			<span class="font-medium">Total budget</span>
			<span class="font-semibold">{formatMoney(total)}</span>
		</div>
	</CardContent>
</Card>

<Card>
	<CardHeader><CardTitle>Skills</CardTitle></CardHeader>
	<CardContent class="space-y-3">
		<p class="text-ink-soft text-sm">Pick relevant skills. Toggle "required" for must-haves.</p>
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
										onchange={(e) => setSkillRequired(s.id, (e.target as HTMLInputElement).checked)}
									/>
									required
								</label>
							{/if}
						</div>
					{/each}
				</div>
			</details>
		{/each}
	</CardContent>
</Card>

{#if submitError}<p class="text-sm text-red-600">{submitError}</p>{/if}

<div class="flex justify-end gap-2">
	<Button variant="ghost" href={redirectTo}>Cancel</Button>
	<Button onclick={submit} disabled={submitting}>
		{submitting ? 'Saving…' : submitLabel}
	</Button>
</div>
