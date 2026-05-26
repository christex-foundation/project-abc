<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let { data } = $props();

	let activeCategoryId = $state<string | null>(untrack(() => data.categories[0]?.id ?? null));
	let newCategoryName = $state('');
	let newSkillName = $state('');
	let renameTarget = $state<string | null>(null);
	let renameValue = $state('');
	let busy = $state(false);
	let errorMsg = $state<string | null>(null);

	const activeCategory = $derived(data.categories.find((c) => c.id === activeCategoryId) ?? null);

	async function addCategory() {
		if (!newCategoryName.trim()) return;
		busy = true;
		errorMsg = null;
		try {
			const res = await fetch('/api/admin/skill-categories', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: newCategoryName.trim() })
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				errorMsg = j?.error?.message ?? `Failed (${res.status})`;
				return;
			}
			newCategoryName = '';
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	async function addSkill() {
		if (!activeCategoryId || !newSkillName.trim()) return;
		busy = true;
		errorMsg = null;
		try {
			const res = await fetch('/api/admin/skills', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: newSkillName.trim(), categoryId: activeCategoryId })
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				errorMsg = j?.error?.message ?? `Failed (${res.status})`;
				return;
			}
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
		errorMsg = null;
		try {
			const res = await fetch(`/api/admin/skills/${skillId}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				errorMsg = j?.error?.message ?? `Rename failed (${res.status})`;
				return;
			}
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
		errorMsg = null;
		try {
			const res = await fetch(`/api/admin/skills/${skillId}`, { method: 'DELETE' });
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				errorMsg = j?.error?.message ?? `Delete failed (${res.status})`;
				return;
			}
			await invalidateAll();
		} finally {
			busy = false;
		}
	}
</script>

<h1 class="text-2xl font-semibold">Skills taxonomy</h1>
<p class="mt-1 text-sm text-zinc-500">
	Manage the skill categories freelancers pick on their profile and sponsors pick on bounties.
</p>

{#if errorMsg}
	<p class="mt-3 text-sm text-red-600">{errorMsg}</p>
{/if}

<div class="mt-6 grid gap-6 md:grid-cols-[280px_1fr]">
	<aside class="rounded border border-zinc-200 bg-white">
		<div class="border-b border-zinc-100 p-3">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					addCategory();
				}}
				class="flex gap-2"
			>
				<input
					type="text"
					bind:value={newCategoryName}
					placeholder="New category"
					class="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm"
				/>
				<button
					type="submit"
					disabled={busy || !newCategoryName.trim()}
					class="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
				>
					Add
				</button>
			</form>
		</div>
		<ul class="divide-y divide-zinc-100">
			{#each data.categories as c (c.id)}
				<li>
					<button
						type="button"
						onclick={() => (activeCategoryId = c.id)}
						class={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50 ${c.id === activeCategoryId ? 'bg-zinc-100 font-medium' : ''}`}
					>
						<span>{c.name}</span>
						<span class="text-xs text-zinc-400">{c.skills.length}</span>
					</button>
				</li>
			{:else}
				<li class="px-3 py-4 text-center text-xs text-zinc-500">No categories yet.</li>
			{/each}
		</ul>
	</aside>

	<section class="rounded border border-zinc-200 bg-white">
		{#if !activeCategory}
			<div class="p-8">
				<EmptyState title="Pick or create a category" />
			</div>
		{:else}
			<header class="flex items-center justify-between border-b border-zinc-100 p-3">
				<h2 class="text-base font-semibold">{activeCategory.name}</h2>
			</header>
			<div class="border-b border-zinc-100 p-3">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						addSkill();
					}}
					class="flex gap-2"
				>
					<input
						type="text"
						bind:value={newSkillName}
						placeholder="New skill name"
						class="flex-1 rounded border border-zinc-300 px-3 py-1.5 text-sm"
					/>
					<button
						type="submit"
						disabled={busy || !newSkillName.trim()}
						class="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
					>
						Add skill
					</button>
				</form>
			</div>
			<ul class="divide-y divide-zinc-100">
				{#each activeCategory.skills as s (s.id)}
					<li class="flex items-center justify-between gap-2 px-3 py-2 text-sm">
						{#if renameTarget === s.id}
							<form
								onsubmit={(e) => {
									e.preventDefault();
									commitRename(s.id);
								}}
								class="flex flex-1 gap-2"
							>
								<input
									type="text"
									bind:value={renameValue}
									class="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
								/>
								<button
									type="submit"
									disabled={busy}
									class="rounded bg-zinc-900 px-3 py-1 text-xs text-white disabled:opacity-50"
								>
									Save
								</button>
								<button
									type="button"
									onclick={() => (renameTarget = null)}
									class="rounded border border-zinc-300 px-2 py-1 text-xs"
								>
									Cancel
								</button>
							</form>
						{:else}
							<span>{s.name}</span>
							<div class="flex gap-2">
								<button
									type="button"
									onclick={() => {
										renameTarget = s.id;
										renameValue = s.name;
									}}
									class="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
								>
									Rename
								</button>
								<button
									type="button"
									onclick={() => deleteSkill(s.id, s.name)}
									class="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
								>
									Delete
								</button>
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
	</section>
</div>
