<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import RichTextView from '$lib/components/editor/RichTextView.svelte';
	import RaiseDisputeButton from '$lib/components/shared/RaiseDisputeButton.svelte';
	import WorkspaceCoachPanel from '$lib/components/ai/WorkspaceCoachPanel.svelte';
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

	let { data } = $props();
	const project = $derived(data.project);
	const role = $derived(data.role);
	const isContractor = $derived(role === 'CONTRACTOR');
	const isOwner = $derived(role === 'OWNER' || role === 'ADMIN');

	type Link = { label: string; url: string };

	function formatMoney(minor: number) {
		return `${project.currency} ${(minor / 100).toLocaleString()}`;
	}
	function deliverablesOf(u: { deliverables: unknown }): Link[] {
		return Array.isArray(u.deliverables) ? (u.deliverables as Link[]) : [];
	}

	const STATUS_LABEL: Record<string, string> = {
		PENDING: 'Upcoming',
		IN_PROGRESS: 'In progress',
		IN_REVIEW: 'In review',
		CHANGES_REQUESTED: 'Changes requested',
		APPROVED: 'Approved & paid'
	};
	function statusVariant(s: string) {
		if (s === 'APPROVED') return 'success' as const;
		if (s === 'IN_REVIEW') return 'default' as const;
		if (s === 'CHANGES_REQUESTED') return 'destructive' as const;
		if (s === 'IN_PROGRESS') return 'outline' as const;
		return 'secondary' as const;
	}

	// Per-milestone form state, keyed by milestone id.
	let updateNote = $state<Record<string, string>>({});
	let updateLinks = $state<Record<string, Link[]>>({});
	let commentBody = $state<Record<string, string>>({});
	let busy = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	// Seed one empty deliverable-link row per milestone so the inputs can bind to
	// stable state members (Svelte can't bind to a function-call expression).
	$effect(() => {
		for (const m of data.milestones) {
			if (!updateLinks[m.id]) updateLinks[m.id] = [{ label: '', url: '' }];
		}
	});

	function addLink(id: string) {
		updateLinks[id] = [...(updateLinks[id] ?? []), { label: '', url: '' }];
	}
	function removeLink(id: string, i: number) {
		updateLinks[id] = (updateLinks[id] ?? []).filter((_, idx) => idx !== i);
	}

	async function call(url: string, key: string, body?: unknown) {
		busy = key;
		errorMsg = null;
		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body ?? {})
			});
			if (!res.ok) {
				const b = await res.json().catch(() => ({}));
				errorMsg = b?.error?.message ?? 'Request failed.';
				return false;
			}
			await invalidateAll();
			return true;
		} catch (e) {
			errorMsg = (e as Error).message;
			return false;
		} finally {
			busy = null;
		}
	}

	async function postUpdate(mid: string) {
		const links = (updateLinks[mid] ?? []).filter((l) => l.url.trim());
		if (!(updateNote[mid] ?? '').trim() || links.length === 0) {
			errorMsg = 'Add a note and at least one deliverable link before submitting.';
			return;
		}
		const ok = await call(`/api/projects/${project.id}/milestones/${mid}/update`, `${mid}:update`, {
			note: updateNote[mid] ?? '',
			deliverables: links
		});
		if (ok) {
			updateNote[mid] = '';
			updateLinks[mid] = [{ label: '', url: '' }];
		}
	}
	async function postComment(mid: string) {
		const ok = await call(
			`/api/projects/${project.id}/milestones/${mid}/comment`,
			`${mid}:comment`,
			{ body: commentBody[mid] ?? '' }
		);
		if (ok) commentBody[mid] = '';
	}
	async function approve(mid: string) {
		if (!confirm('Approve this milestone? This releases the tranche payment from escrow.')) return;
		await call(`/api/projects/${project.id}/milestones/${mid}/approve`, `${mid}:approve`);
	}
	async function requestChanges(mid: string) {
		await call(`/api/projects/${project.id}/milestones/${mid}/request-changes`, `${mid}:changes`, {
			comment: commentBody[mid] || undefined
		});
		commentBody[mid] = '';
	}

	// Reviews (shown when the project is COMPLETED).
	let reviewRating = $state(5);
	let reviewComment = $state('');
	async function submitReview() {
		const ok = await call(`/api/projects/${project.id}/review`, 'review', {
			rating: reviewRating,
			comment: reviewComment || null
		});
		if (ok) reviewComment = '';
	}
</script>

<div class="space-y-6">
	<header class="space-y-1">
		<a href={`/projects/${project.slug}`} class="text-sm text-zinc-500 hover:underline"
			>← {project.title}</a
		>
		<div class="flex flex-wrap items-center gap-2">
			<h1 class="text-2xl font-semibold">Workspace</h1>
			<Badge variant="outline">{project.status}</Badge>
			<Badge variant="secondary">{role}</Badge>
		</div>
		<p class="text-sm text-zinc-500">
			Contractor: {project.contractorNameSnapshot ?? '—'} · Budget {formatMoney(project.budgetCap)}
		</p>
		{#if project.status === 'ACTIVE' && (isOwner || isContractor)}
			<div class="pt-1">
				<RaiseDisputeButton projectId={project.id} title={project.title} label="Raise a dispute" />
			</div>
		{/if}
	</header>

	{#if errorMsg}
		<div class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
			{errorMsg}
		</div>
	{/if}

	{#if project.status === 'COMPLETED'}
		<Card>
			<CardHeader><CardTitle class="text-base">Reviews</CardTitle></CardHeader>
			<CardContent class="space-y-4">
				{#if data.reviews.length > 0}
					<div class="space-y-2">
						{#each data.reviews as r (r.id)}
							<div class="rounded-md border border-zinc-100 p-3 text-sm">
								<div class="flex items-center justify-between text-xs text-zinc-500">
									<span
										>{r.raterNameSnapshot ?? 'A user'} ·
										{r.raterRole === 'COMPANY' ? 'company' : 'contractor'}</span
									>
									<span class="text-amber-500"
										>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span
									>
								</div>
								{#if r.comment}<div class="mt-1"><RichTextView html={r.comment} /></div>{/if}
							</div>
						{/each}
					</div>
				{/if}

				{#if data.canReview}
					<Separator />
					<div class="space-y-2">
						<Label>Leave a review</Label>
						<div class="flex items-center gap-1">
							{#each [1, 2, 3, 4, 5] as n (n)}
								<button
									type="button"
									onclick={() => (reviewRating = n)}
									class="text-2xl leading-none {n <= reviewRating
										? 'text-amber-500'
										: 'text-zinc-300'}"
									aria-label={`${n} star${n === 1 ? '' : 's'}`}
								>
									★
								</button>
							{/each}
						</div>
						<Textarea rows={3} bind:value={reviewComment} placeholder="How did it go? (optional)" />
						<Button size="sm" onclick={submitReview} disabled={busy === 'review'}>
							{busy === 'review' ? 'Submitting…' : 'Submit review'}
						</Button>
					</div>
				{:else if data.myReview}
					<p class="text-xs text-zinc-500">You've left your review. Thanks!</p>
				{/if}
			</CardContent>
		</Card>
	{/if}

	{#if data.milestones.length === 0}
		<Card>
			<CardContent class="py-12 text-center text-zinc-500">
				No milestones yet. They appear once the project is funded.
			</CardContent>
		</Card>
	{/if}

	{#each data.milestones as m (m.id)}
		{@const canSubmit = m.status === 'IN_PROGRESS' || m.status === 'CHANGES_REQUESTED'}
		{@const canReview = m.status === 'IN_REVIEW'}
		<Card>
			<CardHeader>
				<div class="flex flex-wrap items-center justify-between gap-2">
					<CardTitle class="text-base">{m.position}. {m.title}</CardTitle>
					<div class="flex items-center gap-2">
						{#if m.revisionCount > 0}
							<Badge variant="outline">Revision #{m.revisionCount}</Badge>
						{/if}
						<Badge variant={statusVariant(m.status)}>{STATUS_LABEL[m.status] ?? m.status}</Badge>
						<span class="text-sm font-semibold tabular-nums">{formatMoney(m.amount)}</span>
					</div>
				</div>
				{#if m.description}
					<div class="text-sm text-zinc-600"><RichTextView html={m.description} /></div>
				{/if}
			</CardHeader>
			<CardContent class="space-y-4">
				<!-- Thread: updates + comments -->
				{#if m.updates.length > 0 || m.comments.length > 0}
					<div class="space-y-3">
						{#each m.updates as u (u.id)}
							<div class="rounded-md border border-zinc-200 bg-zinc-50 p-3">
								<div class="mb-1 flex items-center justify-between text-xs text-zinc-500">
									<span>{u.author?.name ?? u.authorNameSnapshot ?? 'Contractor'} · update</span>
									<span>{new Date(u.createdAt).toLocaleString()}</span>
								</div>
								<div class="text-sm"><RichTextView html={u.note} /></div>
								{#if deliverablesOf(u).length > 0}
									<ul class="mt-2 space-y-1">
										{#each deliverablesOf(u) as l (l.url)}
											<li>
												<a
													href={l.url}
													target="_blank"
													rel="noopener noreferrer"
													class="text-sm text-indigo-600 underline"
												>
													{l.label || l.url}
												</a>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/each}
						{#each m.comments as c (c.id)}
							<div class="rounded-md border border-zinc-100 p-3">
								<div class="mb-1 flex items-center justify-between text-xs text-zinc-500">
									<span
										>{c.author?.name ?? c.authorNameSnapshot ?? 'User'} ·
										{c.authorRole === 'COMPANY' ? 'company' : 'contractor'}</span
									>
									<span>{new Date(c.createdAt).toLocaleString()}</span>
								</div>
								<div class="text-sm"><RichTextView html={c.body} /></div>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Contractor: post an update (= request approval) -->
				{#if isContractor && canSubmit && project.status === 'ACTIVE'}
					<Separator />
					<div class="space-y-2">
						<Label>Post an update (submits for approval)</Label>
						<Textarea
							rows={3}
							bind:value={updateNote[m.id]}
							placeholder="What did you complete? Anything the reviewer should know…"
						/>
						<p class="text-xs text-zinc-500">Deliverable links (at least one)</p>
						{#each updateLinks[m.id] ?? [] as _link, i (i)}
							<div class="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
								<Input bind:value={updateLinks[m.id][i].label} placeholder="Label" />
								<Input bind:value={updateLinks[m.id][i].url} placeholder="https://…" />
								<Button size="sm" variant="ghost" onclick={() => removeLink(m.id, i)}>✕</Button>
							</div>
						{/each}
						<div class="flex items-center gap-2">
							<Button size="sm" variant="secondary" onclick={() => addLink(m.id)}>+ Link</Button>
							<Button
								size="sm"
								onclick={() => postUpdate(m.id)}
								disabled={busy === `${m.id}:update`}
							>
								{busy === `${m.id}:update` ? 'Submitting…' : 'Submit for approval'}
							</Button>
						</div>
					</div>
				{/if}

				<!-- Contractor: AI delivery coach (suggest-only, never writes the DB) -->
				{#if isContractor && m.status !== 'APPROVED' && project.status === 'ACTIVE' && data.aiEnabled}
					<Separator />
					<WorkspaceCoachPanel
						milestoneId={m.id}
						aiEnabled={data.aiEnabled}
						getDraft={() => ({
							note: updateNote[m.id] ?? '',
							deliverables: updateLinks[m.id] ?? [],
							comment: commentBody[m.id] ?? ''
						})}
						onApplyReply={(text) => (commentBody[m.id] = text)}
						onApplyNote={(text) => (updateNote[m.id] = text)}
					/>
				{/if}

				<!-- Owner: approve / request changes on a submitted milestone -->
				{#if isOwner && canReview}
					<Separator />
					<div class="space-y-2">
						<Textarea
							rows={2}
							bind:value={commentBody[m.id]}
							placeholder="Optional feedback (sent with your decision or as a comment)…"
						/>
						<div class="flex gap-2">
							<Button size="sm" onclick={() => approve(m.id)} disabled={busy === `${m.id}:approve`}>
								{busy === `${m.id}:approve` ? 'Approving…' : 'Approve & pay'}
							</Button>
							<Button
								size="sm"
								variant="outline"
								onclick={() => requestChanges(m.id)}
								disabled={busy === `${m.id}:changes`}
							>
								{busy === `${m.id}:changes` ? 'Sending…' : 'Request changes'}
							</Button>
						</div>
					</div>
				{/if}

				<!-- Either party: comment (while not approved) -->
				{#if m.status !== 'APPROVED' && project.status === 'ACTIVE' && !(isOwner && canReview)}
					<Separator />
					<div class="flex gap-2">
						<Input bind:value={commentBody[m.id]} placeholder="Add a comment…" />
						<Button
							size="sm"
							variant="outline"
							onclick={() => postComment(m.id)}
							disabled={busy === `${m.id}:comment`}
						>
							Send
						</Button>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/each}
</div>
