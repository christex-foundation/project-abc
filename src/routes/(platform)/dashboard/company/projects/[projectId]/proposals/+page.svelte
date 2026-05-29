<script lang="ts">
	import { enhance } from '$app/forms';
	import { SvelteSet } from 'svelte/reactivity';
	import RichTextView from '$lib/components/editor/RichTextView.svelte';
	import {
		Button,
		Card,
		CardHeader,
		CardTitle,
		CardContent,
		Badge,
		Separator
	} from '$lib/components/ui';
	import { trackSubmit } from '$lib/client/forms';

	let { data, form } = $props();
	const project = $derived(data.project);

	const busy = new SvelteSet<string>();
	const submitFor = (key: string) => trackSubmit((v) => (v ? busy.add(key) : busy.delete(key)));

	function confirmAward(e: Event, name: string) {
		if (
			!confirm(
				`Award this project to ${name}? Their milestones lock in and all other proposals are rejected. You'll fund escrow next.`
			)
		) {
			e.preventDefault();
		}
	}

	function formatMoney(minor: number) {
		return `${project.currency} ${(minor / 100).toLocaleString()}`;
	}

	const isOpen = $derived(project.status === 'OPEN');
	const submitted = $derived(data.proposals.filter((p) => p.status === 'SUBMITTED'));
</script>

<div class="space-y-6">
	<header class="space-y-1">
		<a href="/dashboard/company/projects" class="text-sm text-zinc-500 hover:underline">
			← Your projects
		</a>
		<div class="flex items-center gap-2">
			<h1 class="text-2xl font-semibold">{project.title}</h1>
			<Badge variant="outline">{project.status}</Badge>
		</div>
		<p class="text-sm text-zinc-500">
			Budget {formatMoney(project.budgetCap)} · {data.proposals.length} proposal{data.proposals
				.length === 1
				? ''
				: 's'}
		</p>
	</header>

	{#if form?.message}
		<div
			class="rounded-md border px-3 py-2 text-sm"
			class:border-red-300={!form?.success}
			class:bg-red-50={!form?.success}
			class:text-red-700={!form?.success}
			class:border-emerald-300={form?.success}
			class:bg-emerald-50={form?.success}
			class:text-emerald-700={form?.success}
		>
			{form?.success ? 'Project awarded. Fund escrow to begin.' : form.message}
		</div>
	{/if}

	{#if !isOpen && project.awardedProposalId}
		<Card>
			<CardContent class="py-4 text-sm text-zinc-600">
				This project has been awarded to <strong>{project.contractorNameSnapshot}</strong>.
				{#if project.status === 'AWARDED'}
					<a href={`/dashboard/company/projects/${project.id}/fund`} class="underline"
						>Fund escrow</a
					>
					to start the work.
				{/if}
			</CardContent>
		</Card>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle class="text-base">Milestone plan</CardTitle>
		</CardHeader>
		<CardContent>
			<ul class="space-y-1 text-sm">
				{#each project.milestones as m (m.id)}
					<li class="flex justify-between gap-2">
						<span>{m.position}. {m.title}{m.dueInDays ? ` · ${m.dueInDays}d` : ''}</span>
						<span class="font-medium tabular-nums">{formatMoney(m.amount)}</span>
					</li>
				{/each}
			</ul>
			{#if project.status === 'AWARDED'}
				<p class="mt-3 text-xs text-zinc-500">
					You can still <a href={`/dashboard/company/projects/${project.id}/edit`} class="underline"
						>adjust milestones</a
					> until you fund escrow.
				</p>
			{/if}
		</CardContent>
	</Card>

	{#if data.proposals.length === 0}
		<Card>
			<CardContent class="py-12 text-center text-zinc-500">No proposals yet.</CardContent>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each data.proposals as p (p.id)}
				<Card>
					<CardHeader>
						<div class="flex flex-wrap items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								<CardTitle class="text-base">
									{p.freelancer?.displayName ?? p.freelancerNameSnapshot ?? 'Applicant'}
								</CardTitle>
								<Badge
									variant={p.status === 'AWARDED'
										? 'success'
										: p.status === 'REJECTED' || p.status === 'WITHDRAWN'
											? 'secondary'
											: 'outline'}
								>
									{p.status}
								</Badge>
							</div>
						</div>
						{#if p.freelancer?.headline}
							<p class="text-sm text-zinc-500">{p.freelancer.headline}</p>
						{/if}
						{#if p.freelancer?.user?.id && data.ratings[p.freelancer.user.id]?.count}
							{@const r = data.ratings[p.freelancer.user.id]}
							<p class="text-xs text-amber-600">
								★ {r.avg} · {r.count} review{r.count === 1 ? '' : 's'}
							</p>
						{/if}
					</CardHeader>
					<CardContent class="space-y-3">
						{#if p.proposedTimeline}
							<p class="text-sm">
								<span class="text-zinc-500">Timeline:</span>
								{p.proposedTimeline}
							</p>
						{/if}

						<div class="text-sm">
							<RichTextView html={p.coverLetter} />
						</div>

						{#if p.freelancer?.portfolio}
							<a
								href={p.freelancer.portfolio}
								target="_blank"
								rel="noopener noreferrer"
								class="text-sm text-indigo-600 underline"
							>
								Portfolio
							</a>
						{/if}

						{#if isOpen && p.status === 'SUBMITTED'}
							<form
								method="POST"
								action="?/award"
								use:enhance={submitFor(`${p.id}:award`)}
								onsubmit={(e) =>
									confirmAward(
										e,
										p.freelancer?.displayName ?? p.freelancerNameSnapshot ?? 'this applicant'
									)}
							>
								<input type="hidden" name="proposalId" value={p.id} />
								<Button type="submit" disabled={busy.has(`${p.id}:award`)}>
									{busy.has(`${p.id}:award`) ? 'Awarding…' : 'Award this proposal'}
								</Button>
							</form>
						{/if}
					</CardContent>
				</Card>
			{/each}
		</div>

		{#if isOpen && submitted.length === 0}
			<p class="text-sm text-zinc-500">No open proposals to award.</p>
		{/if}
	{/if}
</div>
