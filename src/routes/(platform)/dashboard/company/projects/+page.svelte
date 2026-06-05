<script lang="ts">
	import { enhance } from '$app/forms';
	import { SvelteSet } from 'svelte/reactivity';
	import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '$lib/components/ui';
	import { trackSubmit } from '$lib/client/forms';

	let { data, form } = $props();

	const busy = new SvelteSet<string>();
	const submitFor = (key: string) => trackSubmit((v) => (v ? busy.add(key) : busy.delete(key)));

	function confirmDelete(e: Event, title: string) {
		if (!confirm(`Discard "${title}"? This cannot be undone.`)) e.preventDefault();
	}

	function confirmCancel(e: Event, title: string) {
		if (
			!confirm(
				`Cancel "${title}"? Any unpaid escrow is refunded and the contractor + applicants are notified.`
			)
		) {
			e.preventDefault();
		}
	}

	const statusOrder = ['DRAFT', 'OPEN', 'AWARDED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
	type Status = (typeof statusOrder)[number];

	const grouped = $derived.by(() => {
		const out: Record<Status, typeof data.projects> = {
			DRAFT: [],
			OPEN: [],
			AWARDED: [],
			ACTIVE: [],
			COMPLETED: [],
			CANCELLED: []
		};
		for (const p of data.projects) (out[p.status as Status] ??= []).push(p);
		return out;
	});

	function badgeVariant(s: Status) {
		if (s === 'DRAFT') return 'secondary' as const;
		if (s === 'OPEN' || s === 'ACTIVE') return 'success' as const;
		if (s === 'CANCELLED') return 'destructive' as const;
		return 'outline' as const;
	}

	function formatMoney(minor: number, currency: string) {
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}
</script>

<div class="space-y-6">
	<header class="flex items-center justify-between gap-3">
		<div>
			<h1 class="fow-display text-ink text-3xl">Your projects</h1>
			<p class="text-ink-soft mt-1 text-sm">Drafts, open proposals, and active engagements.</p>
		</div>
		<Button href="/projects/create">+ Create</Button>
	</header>

	{#if form?.message}
		<div
			class="rounded-md border px-3 py-2 text-sm"
			class:border-red-300={!form?.success}
			class:bg-red-50={!form?.success}
			class:text-red-700={!form?.success}
			class:border-forest={form?.success}
			class:bg-forest-soft={form?.success}
			class:text-forest={form?.success}
		>
			{form.message}
		</div>
	{/if}

	{#if data.projects.length === 0}
		<Card>
			<CardContent class="text-ink-soft py-12 text-center">
				No projects yet. <a href="/projects/create" class="underline">Create your first one</a>.
			</CardContent>
		</Card>
	{:else}
		{#each statusOrder as s (s)}
			{#if grouped[s].length > 0}
				<section class="space-y-2">
					<h2 class="text-ink-soft font-mono text-xs font-semibold tracking-wide uppercase">{s}</h2>
					<div class="grid gap-3 sm:grid-cols-2">
						{#each grouped[s] as p (p.id)}
							<Card>
								<CardHeader>
									<div class="flex items-center justify-between">
										<Badge variant={badgeVariant(s)}>{s}</Badge>
										<span class="text-ink-soft font-mono text-xs tabular-nums"
											>up to {formatMoney(p.budgetCap, p.currency)}</span
										>
									</div>
									<CardTitle class="line-clamp-2 text-base">{p.title}</CardTitle>
								</CardHeader>
								<CardContent class="space-y-3">
									<div class="flex flex-wrap items-center justify-between gap-2">
										<Button size="sm" variant="outline" href={`/projects/${p.slug}`}>
											{s === 'DRAFT' ? 'Preview' : 'View'}
										</Button>
										{#if s === 'DRAFT' || s === 'AWARDED'}
											<Button
												size="sm"
												variant="outline"
												href={`/dashboard/company/projects/${p.id}/edit`}
											>
												Edit
											</Button>
										{/if}
										{#if s === 'OPEN' || s === 'AWARDED'}
											<Button
												size="sm"
												variant="outline"
												href={`/dashboard/company/projects/${p.id}/proposals`}
											>
												Proposals
											</Button>
										{:else if s === 'ACTIVE' || s === 'COMPLETED'}
											<Button size="sm" variant="outline" href={`/projects/${p.slug}/workspace`}>
												Workspace
											</Button>
										{/if}
									</div>

									{#if s === 'DRAFT'}
										<div class="flex gap-2">
											<form
												method="POST"
												action="?/publish"
												use:enhance={submitFor(`${p.id}:publish`)}
												class="flex-1"
											>
												<input type="hidden" name="projectId" value={p.id} />
												<Button
													size="sm"
													type="submit"
													disabled={busy.has(`${p.id}:publish`)}
													class="w-full"
												>
													{busy.has(`${p.id}:publish`) ? 'Publishing…' : 'Publish'}
												</Button>
											</form>
											<form
												method="POST"
												action="?/delete"
												use:enhance={submitFor(`${p.id}:delete`)}
												onsubmit={(e) => confirmDelete(e, p.title)}
												class="flex-1"
											>
												<input type="hidden" name="projectId" value={p.id} />
												<Button
													size="sm"
													variant="outline"
													type="submit"
													disabled={busy.has(`${p.id}:delete`)}
													class="w-full text-red-600"
												>
													{busy.has(`${p.id}:delete`) ? 'Discarding…' : 'Discard'}
												</Button>
											</form>
										</div>
									{:else if s === 'AWARDED'}
										<Button
											size="sm"
											class="w-full"
											href={`/dashboard/company/projects/${p.id}/fund`}
										>
											Fund escrow
										</Button>
									{/if}

									{#if s === 'OPEN' || s === 'AWARDED' || s === 'ACTIVE'}
										<form
											method="POST"
											action="?/cancel"
											use:enhance={submitFor(`${p.id}:cancel`)}
											onsubmit={(e) => confirmCancel(e, p.title)}
										>
											<input type="hidden" name="projectId" value={p.id} />
											<Button
												size="sm"
												variant="outline"
												type="submit"
												disabled={busy.has(`${p.id}:cancel`)}
												class="w-full text-red-600"
											>
												{busy.has(`${p.id}:cancel`) ? 'Cancelling…' : 'Cancel & refund'}
											</Button>
										</form>
									{/if}
								</CardContent>
							</Card>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	{/if}
</div>
