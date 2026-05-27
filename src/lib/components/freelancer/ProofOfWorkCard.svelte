<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		Badge,
		Button,
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
		Input,
		Label,
		Textarea
	} from '$lib/components/ui';

	type Skill = {
		id: string;
		name: string;
		slug: string;
		categoryId: string;
		parentSkillId: string | null;
	};
	type SkillCategory = {
		id: string;
		name: string;
		skills: Skill[];
	};
	type ProofOfWorkItem = {
		id: string;
		title: string;
		description: string;
		link: string;
		createdAt: string | Date;
		skills: { skill: Skill }[];
	};

	type Props = {
		items: ProofOfWorkItem[];
		skillCategories: SkillCategory[];
	};

	let { items, skillCategories }: Props = $props();

	// Flatten all skills across categories — the picker uses parentSkillId, not categoryId.
	const allSkills = $derived(skillCategories.flatMap((c) => c.skills));
	const topLevelSkills = $derived(
		allSkills.filter((s) => s.parentSkillId === null).sort((a, b) => a.name.localeCompare(b.name))
	);
	const skillById = $derived(new Map(allSkills.map((s) => [s.id, s])));

	const DESCRIPTION_MAX = 180;

	let formOpen = $state(false);
	let editingId = $state<string | null>(null);
	let title = $state('');
	let description = $state('');
	let link = $state('');
	let selectedParentIds = $state<string[]>([]);
	let selectedSubIds = $state<string[]>([]);
	let saving = $state(false);
	let errorMsg = $state<string | null>(null);
	let deletingId = $state<string | null>(null);

	const descriptionLeft = $derived(DESCRIPTION_MAX - description.length);

	// Children of currently selected parents. Sub-skill picks for parents that get
	// unticked are dropped automatically.
	const availableSubSkills = $derived(
		allSkills
			.filter((s) => s.parentSkillId !== null && selectedParentIds.includes(s.parentSkillId))
			.sort((a, b) => a.name.localeCompare(b.name))
	);

	function resetForm() {
		editingId = null;
		title = '';
		description = '';
		link = '';
		selectedParentIds = [];
		selectedSubIds = [];
		errorMsg = null;
	}

	function openCreate() {
		resetForm();
		formOpen = true;
	}

	function openEdit(item: ProofOfWorkItem) {
		const allItemSkillIds = item.skills.map((s) => s.skill.id);
		editingId = item.id;
		title = item.title;
		description = item.description;
		link = item.link;
		selectedParentIds = allItemSkillIds.filter((id) => {
			const s = skillById.get(id);
			return s != null && s.parentSkillId === null;
		});
		selectedSubIds = allItemSkillIds.filter((id) => {
			const s = skillById.get(id);
			return s != null && s.parentSkillId !== null;
		});
		errorMsg = null;
		formOpen = true;
	}

	function cancel() {
		resetForm();
		formOpen = false;
	}

	function toggleParent(skillId: string) {
		if (selectedParentIds.includes(skillId)) {
			selectedParentIds = selectedParentIds.filter((id) => id !== skillId);
			// drop children of the unticked parent
			selectedSubIds = selectedSubIds.filter((subId) => {
				const sub = skillById.get(subId);
				return sub?.parentSkillId !== skillId;
			});
		} else {
			selectedParentIds = [...selectedParentIds, skillId];
		}
	}

	function toggleSub(skillId: string) {
		if (selectedSubIds.includes(skillId)) {
			selectedSubIds = selectedSubIds.filter((id) => id !== skillId);
		} else {
			selectedSubIds = [...selectedSubIds, skillId];
		}
	}

	async function save() {
		errorMsg = null;
		if (!title.trim() || !description.trim() || !link.trim()) {
			errorMsg = 'Title, description and link are required.';
			return;
		}
		if (selectedParentIds.length === 0) {
			errorMsg = 'Pick at least one skill.';
			return;
		}
		if (selectedSubIds.length === 0) {
			errorMsg = 'Pick at least one sub-skill.';
			return;
		}

		saving = true;
		try {
			const payload = {
				title,
				description,
				link,
				skillIds: [...selectedParentIds, ...selectedSubIds]
			};
			const url = editingId
				? `/api/users/me/proof-of-work/${editingId}`
				: '/api/users/me/proof-of-work';
			const method = editingId ? 'PATCH' : 'POST';
			const res = await fetch(url, {
				method,
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = body?.error?.message ?? `Save failed (${res.status})`;
				return;
			}
			await invalidateAll();
			resetForm();
			formOpen = false;
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}

	async function remove(item: ProofOfWorkItem) {
		if (!confirm(`Delete "${item.title}"?`)) return;
		deletingId = item.id;
		try {
			const res = await fetch(`/api/users/me/proof-of-work/${item.id}`, { method: 'DELETE' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				alert(body?.error?.message ?? `Delete failed (${res.status})`);
				return;
			}
			await invalidateAll();
		} finally {
			deletingId = null;
		}
	}
</script>

<Card>
	<CardHeader>
		<CardTitle>Proof of work</CardTitle>
		<CardDescription>
			Show off projects you've shipped. Sponsors see these when reviewing your submissions.
		</CardDescription>
	</CardHeader>
	<CardContent class="space-y-4">
		{#if items.length === 0 && !formOpen}
			<p class="text-sm text-zinc-500">No proof of work yet. Add a project to stand out.</p>
		{/if}

		{#if items.length > 0}
			<ul class="space-y-3">
				{#each items as item (item.id)}
					<li class="rounded-md border border-zinc-200 p-3">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 space-y-1">
								<div class="flex items-center gap-2">
									<h3 class="truncate font-medium">{item.title}</h3>
								</div>
								<p class="text-sm text-zinc-600">{item.description}</p>
								<a
									href={item.link}
									target="_blank"
									rel="noopener noreferrer"
									class="inline-block text-xs break-all text-blue-600 hover:underline"
								>
									{item.link}
								</a>
								{#if item.skills.length > 0}
									<div class="flex flex-wrap gap-1 pt-1">
										{#each item.skills as ps (ps.skill.id)}
											<Badge variant={ps.skill.parentSkillId === null ? 'default' : 'secondary'}>
												{ps.skill.name}
											</Badge>
										{/each}
									</div>
								{/if}
							</div>
							<div class="flex shrink-0 gap-1">
								<Button size="sm" variant="ghost" onclick={() => openEdit(item)}>Edit</Button>
								<Button
									size="sm"
									variant="ghost"
									disabled={deletingId === item.id}
									onclick={() => remove(item)}
								>
									{deletingId === item.id ? '…' : 'Delete'}
								</Button>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		{#if !formOpen}
			<Button variant="outline" onclick={openCreate}>Add proof of work</Button>
		{:else}
			<div class="space-y-4 rounded-md border border-zinc-200 p-4">
				<div class="space-y-1">
					<Label for="pow-title">Project title</Label>
					<Input
						id="pow-title"
						bind:value={title}
						maxlength={120}
						placeholder="Project Title"
						required
					/>
				</div>

				<div class="space-y-1">
					<Label for="pow-description">Description</Label>
					<Textarea
						id="pow-description"
						bind:value={description}
						maxlength={DESCRIPTION_MAX}
						rows={3}
						placeholder="Project Description"
					/>
					<p class="text-xs text-zinc-500">
						{descriptionLeft} character{descriptionLeft === 1 ? '' : 's'} left
					</p>
				</div>

				<div class="space-y-2">
					<Label>Skills</Label>
					{#if topLevelSkills.length === 0}
						<p class="text-xs text-zinc-500">No skills available.</p>
					{:else}
						<div class="flex flex-wrap gap-2">
							{#each topLevelSkills as skill (skill.id)}
								{@const sel = selectedParentIds.includes(skill.id)}
								<button
									type="button"
									onclick={() => toggleParent(skill.id)}
									class={`rounded-md border px-2 py-1 text-sm ${sel ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
								>
									{skill.name}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<div class="space-y-2">
					<Label>Sub skills</Label>
					{#if selectedParentIds.length === 0}
						<p class="text-xs text-zinc-500">Select a skill to see sub-skills.</p>
					{:else if availableSubSkills.length === 0}
						<p class="text-xs text-zinc-500">No sub-skills for the selected skill(s).</p>
					{:else}
						<div class="flex flex-wrap gap-2">
							{#each availableSubSkills as skill (skill.id)}
								{@const sel = selectedSubIds.includes(skill.id)}
								<button
									type="button"
									onclick={() => toggleSub(skill.id)}
									class={`rounded-md border px-2 py-1 text-sm ${sel ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400'}`}
								>
									{skill.name}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<div class="space-y-1">
					<Label for="pow-link">Link</Label>
					<Input
						id="pow-link"
						type="url"
						bind:value={link}
						maxlength={500}
						placeholder="https://"
						required
					/>
				</div>

				{#if errorMsg}
					<p class="text-sm text-red-600">{errorMsg}</p>
				{/if}

				<div class="flex items-center gap-2">
					<Button onclick={save} disabled={saving}>
						{saving ? 'Saving…' : editingId ? 'Update' : 'Add'}
					</Button>
					<Button variant="ghost" onclick={cancel} disabled={saving}>Cancel</Button>
				</div>
			</div>
		{/if}
	</CardContent>
</Card>
