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
	import type { ProposalRankResult } from '$lib/validators/ai';

	let { data, form } = $props();
	const project = $derived(data.project);

	const busy = new SvelteSet<string>();
	const submitFor = (key: string) => trackSubmit((v) => (v ? busy.add(key) : busy.delete(key)));

	// AI shortlist — fetched on demand. Sponsor-facing only; the endpoint degrades
	// to embedding order when AI is off (rankedBy tells us which path ran).
	let shortlist = $state<ProposalRankResult | null>(null);
	let shortlistLoading = $state(false);
	let shortlistError = $state<string | null>(null);

	async function loadShortlist() {
		shortlistLoading = true;
		shortlistError = null;
		try {
			const res = await fetch(`/api/projects/${project.id}/ai-shortlist`, { method: 'POST' });
			const body = await res.json();
			if (!res.ok) throw new Error(body?.error?.message ?? 'Could not rank proposals.');
			shortlist = body.result as ProposalRankResult;
		} catch (e) {
			shortlistError = e instanceof Error ? e.message : 'Could not rank proposals.';
		} finally {
			shortlistLoading = false;
		}
	}

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

	{#if data.proposals.some((p) => p.status === 'SUBMITTED')}
		<Card>
			<CardHeader>
				<div class="flex flex-wrap items-center justify-between gap-2">
					<CardTitle class="text-base">AI shortlist</CardTitle>
					<Button variant="outline" size="sm" onclick={loadShortlist} disabled={shortlistLoading}>
						{shortlistLoading ? 'Ranking…' : shortlist ? 'Re-rank' : 'Rank applicants'}
					</Button>
				</div>
				<p class="text-sm text-zinc-500">
					{#if data.aiEnabled}
						Get a reasoned ranking of submitted proposals. Suggestions only — you still choose.
					{:else}
						AI ranking is off — applicants will be ordered by profile similarity only.
					{/if}
				</p>
			</CardHeader>
			{#if shortlistError || shortlist}
				<CardContent class="space-y-3">
					{#if shortlistError}
						<p class="text-sm text-red-600">{shortlistError}</p>
					{:else if shortlist}
						{#if shortlist.rankedBy === 'embedding'}
							<p class="text-xs text-amber-600">Ranked by similarity only — AI unavailable.</p>
						{:else if shortlist.rankedBy === 'none'}
							<p class="text-sm text-zinc-500">Not enough signal to rank these proposals yet.</p>
						{/if}
						{#each shortlist.items as item (item.proposalId)}
							<div class="rounded-md border p-3">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<div class="flex items-center gap-2">
										<Badge variant="outline">#{item.rank}</Badge>
										<span class="font-medium">{item.displayName}</span>
									</div>
									<div class="flex items-center gap-2 text-xs text-zinc-500">
										{#if item.matchScore != null}
											<span>Fit {item.matchScore}/100</span>
										{/if}
										{#if item.similarity != null}
											<span>· similarity {(item.similarity * 100).toFixed(0)}%</span>
										{/if}
									</div>
								</div>
								{#if item.strengths.length || item.risks.length || item.suggestedQuestions.length}
									<div class="mt-2 grid gap-2 text-sm sm:grid-cols-3">
										{#if item.strengths.length}
											<div>
												<p class="text-xs font-medium text-emerald-700">Strengths</p>
												<ul class="list-disc pl-4 text-zinc-600">
													{#each item.strengths as s, i (i)}<li>{s}</li>{/each}
												</ul>
											</div>
										{/if}
										{#if item.risks.length}
											<div>
												<p class="text-xs font-medium text-amber-700">Risks</p>
												<ul class="list-disc pl-4 text-zinc-600">
													{#each item.risks as r, i (i)}<li>{r}</li>{/each}
												</ul>
											</div>
										{/if}
										{#if item.suggestedQuestions.length}
											<div>
												<p class="text-xs font-medium text-indigo-700">Ask them</p>
												<ul class="list-disc pl-4 text-zinc-600">
													{#each item.suggestedQuestions as q, i (i)}<li>{q}</li>{/each}
												</ul>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					{/if}
				</CardContent>
			{/if}
		</Card>
	{/if}

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
