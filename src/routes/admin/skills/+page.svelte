<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { PageHeader, Card, Button, Input } from '$lib/components/ui';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';

	let { data } = $props();

	let activeCategoryId = $state<string | null>(untrack(() => data.categories[0]?.id ?? null));
	let newCategoryName = $state('');
	let newSkillName = $state('');
	let renameTarget = $state<string | null>(null);
	let renameValue = $state('');
	let busy = $state(false);

	const activeCategory = $derived(data.categories.find((c) => c.id === activeCategoryId) ?? null);

	async function addCategory() {
		if (!newCategoryName.trim()) return;
		busy = true;
		try {
			const res = await fetch('/api/admin/skill-categories', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: newCategoryName.trim() })
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				toast.error(j?.error?.message ?? 'Failed.');
				return;
			}
			toast.success(`Category "${newCategoryName.trim()}" added.`);
			newCategoryName = '';
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	async function addSkill() {
		if (!activeCategoryId || !newSkillName.trim()) return;
		busy = true;
		try {
			const res = await fetch('/api/admin/skills', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: newSkillName.trim(), categoryId: activeCategoryId })
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				toast.error(j?.error?.message ?? 'Failed.');
				return;
			}
			toast.success(`Skill "${newSkillName.trim()}" added.`);
			newSkillName = '';
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	async function commitRename(skillId: string) {
		const name = renameValue.trim();
		if (!name) {
			renameTarget = null;
			return;
		}
		busy = true;
		try {
			const res = await fetch(`/api/admin/skills/${skillId}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				toast.error(j?.error?.message ?? 'Rename failed.');
				return;
			}
			toast.success('Skill renamed.');
			renameTarget = null;
			renameValue = '';
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	async function deleteSkill(skillId: string, name: string) {
		if (!confirm(`Delete skill "${name}"? Blocked if any freelancer/bounty references it.`)) return;
		busy = true;
		try {
			const res = await fetch(`/api/admin/skills/${skillId}`, { method: 'DELETE' });
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				toast.error(j?.error?.message ?? 'Delete failed.');
				return;
			}
			toast.success(`Skill "${name}" deleted.`);
			await invalidateAll();
		} finally {
			busy = false;
		}
	}
</script>

<PageHeader
	title="Skills taxonomy"
	description="Manage the skill categories freelancers and sponsors choose from."
/>

<div class="grid gap-6 md:grid-cols-[300px_1fr]">
	<Card>
		<div class="border-b border-zinc-100 p-3">
			<form
				class="flex gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					addCategory();
				}}
			>
				<Input bind:value={newCategoryName} placeholder="New category" />
				<Button type="submit" size="sm" disabled={busy || !newCategoryName.trim()}>
					<Plus class="h-3.5 w-3.5" />
				</Button>
			</form>
		</div>
		<ul class="divide-y divide-zinc-100">
			{#each data.categories as c (c.id)}
				<li>
					<button
						type="button"
						onclick={() => (activeCategoryId = c.id)}
						class={[
							'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors',
							c.id === activeCategoryId
								? 'bg-indigo-50 font-medium text-indigo-900'
								: 'hover:bg-zinc-50'
						]}
					>
						<span>{c.name}</span>
						<span class="rounded-full bg-zinc-100 px-2 text-[10px] text-zinc-600"
							>{c.skills.length}</span
						>
					</button>
				</li>
			{:else}
				<li class="px-3 py-6 text-center text-xs text-zinc-500">No categories yet.</li>
			{/each}
		</ul>
	</Card>

	<Card>
		{#if !activeCategory}
			<div class="p-8">
				<EmptyState title="Pick or create a category" />
			</div>
		{:else}
			<header class="flex items-center justify-between border-b border-zinc-100 p-3">
				<h2 class="text-sm font-semibold">{activeCategory.name}</h2>
				<span class="text-xs text-zinc-500">{activeCategory.skills.length} skills</span>
			</header>
			<div class="border-b border-zinc-100 p-3">
				<form
					class="flex gap-2"
					onsubmit={(e) => {
						e.preventDefault();
						addSkill();
					}}
				>
					<Input bind:value={newSkillName} placeholder="New skill name" />
					<Button type="submit" size="sm" disabled={busy || !newSkillName.trim()}>
						<Plus class="h-3.5 w-3.5" />
						Add
					</Button>
				</form>
			</div>
			<ul class="divide-y divide-zinc-100">
				{#each activeCategory.skills as s (s.id)}
					<li class="flex items-center justify-between gap-2 px-3 py-2 text-sm">
						{#if renameTarget === s.id}
							<form
								class="flex flex-1 gap-2"
								onsubmit={(e) => {
									e.preventDefault();
									commitRename(s.id);
								}}
							>
								<Input bind:value={renameValue} class="!h-8 !text-sm" />
								<Button type="submit" size="sm" disabled={busy}>Save</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={() => (renameTarget = null)}
								>
									Cancel
								</Button>
							</form>
						{:else}
							<span class="text-zinc-800">{s.name}</span>
							<div class="flex gap-1">
								<Button
									variant="outline"
									size="sm"
									onclick={() => {
										renameTarget = s.id;
										renameValue = s.name;
									}}
								>
									<Pencil class="h-3 w-3" />
								</Button>
								<Button variant="destructive" size="sm" onclick={() => deleteSkill(s.id, s.name)}>
									<Trash2 class="h-3 w-3" />
								</Button>
							</div>
						{/if}
					</li>
				{:else}
					<li class="px-3 py-6 text-center text-xs text-zinc-500">
						No skills in this category yet.
					</li>
				{/each}
			</ul>
		{/if}
	</Card>
</div>
