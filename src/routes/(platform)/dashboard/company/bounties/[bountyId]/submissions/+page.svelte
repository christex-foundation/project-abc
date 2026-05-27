<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Badge,
		Button,
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		Input,
		Label,
		Select,
		Textarea
	} from '$lib/components/ui';
	import { SubmissionLabel } from '@prisma/client';

	let { data, form } = $props();

	const LABEL_VALUES = [
		'UNREVIEWED',
		'REVIEWED',
		'SHORTLISTED',
		'SPAM',
		'LOW_QUALITY',
		'MID_QUALITY',
		'HIGH_QUALITY'
	] as const;

	function labelVariant(l: string) {
		if (l === 'SHORTLISTED' || l === 'HIGH_QUALITY') return 'success' as const;
		if (l === 'SPAM' || l === 'LOW_QUALITY') return 'destructive' as const;
		if (l === 'MID_QUALITY' || l === 'REVIEWED') return 'outline' as const;
		return 'secondary' as const;
	}

	/** Badge variant for the freelancer-visible status field. */
	function statusVariant(status: string) {
		if (status === 'APPROVED') return 'outline' as const;
		if (status === 'REJECTED') return 'destructive' as const;
		return 'secondary' as const;
	}

	function statusLabel(status: string) {
		if (status === 'APPROVED') return 'Shortlisted';
		if (status === 'REJECTED') return 'Rejected';
		return 'Pending';
	}

	function formatMoney(minor: number | null | undefined, currency: string) {
		if (minor == null) return '—';
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	const bounty = $derived(data.bounty);
	const submissions = $derived(data.submissions);
	const showJudgingButton = $derived(bounty.status === 'ACTIVE');
	const allowToggleWinner = $derived(
		(bounty.status === 'ACTIVE' || bounty.status === 'JUDGING') && !bounty.isWinnersAnnounced
	);
	const winnerCount = $derived(submissions.filter((s) => s.isWinner).length);
	const showAnnounceButton = $derived(
		bounty.status === 'JUDGING' && !bounty.isWinnersAnnounced && winnerCount > 0
	);

	const eligibilityQuestions = $derived.by(() => {
		const e = bounty.eligibility;
		return Array.isArray(e) ? (e as Array<{ question: string; optional?: boolean }>) : [];
	});
</script>

<div class="space-y-6">
	<header class="space-y-1">
		<div class="flex items-center gap-2 text-sm text-zinc-500">
			<a href="/dashboard/company/bounties" class="underline">Bounties</a>
			<span>/</span>
			<span>Submissions</span>
		</div>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 class="text-2xl font-semibold">{bounty.title}</h1>
				<div class="mt-1 flex flex-wrap items-center gap-2 text-sm">
					<Badge variant="outline">{bounty.status}</Badge>
					<Badge variant="outline">{bounty.type}</Badge>
					<span class="text-zinc-500">
						Prize pool: {formatMoney(bounty.totalPrizePool, bounty.currency)}
					</span>
				</div>
			</div>
			<div class="flex gap-2">
				<Button variant="outline" href={`/bounties/${bounty.slug}`}>View public page</Button>
				{#if bounty.isWinnersAnnounced}
					<Button variant="outline" href={`/dashboard/company/bounties/${bounty.id}/payments`}>
						Payouts
					</Button>
				{/if}
				{#if showJudgingButton}
					<form method="POST" action="?/judging" use:enhance>
						<Button type="submit">Move to judging</Button>
					</form>
				{/if}
				{#if showAnnounceButton}
					<form
						method="POST"
						action="?/announce"
						use:enhance
						onsubmit={(e) => {
							const ok = confirm(
								`Announce ${winnerCount} winner${winnerCount === 1 ? '' : 's'} and trigger payouts? This cannot be undone.`
							);
							if (!ok) e.preventDefault();
						}}
					>
						<Button type="submit">Announce winners ({winnerCount})</Button>
					</form>
				{/if}
			</div>
		</div>
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
			{form.message}
		</div>
	{/if}

	{#if submissions.length === 0}
		<Card>
			<CardContent class="py-12 text-center text-zinc-500">No submissions yet.</CardContent>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each submissions as s (s.id)}
				{@const hasPayoutMethod = !!s.freelancer?.monimeFinancialAccountId}
				<Card>
					<CardHeader>
						<div class="flex flex-wrap items-center justify-between gap-2">
							<CardTitle class="text-base">
								{s.freelancer?.displayName ?? s.freelancerNameSnapshot ?? '(deleted user)'}
								{#if s.freelancer}
									<span class="ml-2 text-xs font-normal text-zinc-500">
										{s.freelancer.user.email}
									</span>
								{/if}
							</CardTitle>
							<div class="flex flex-wrap items-center gap-2">
								<Badge variant={labelVariant(s.label)}>{s.label}</Badge>
								<Badge variant={statusVariant(s.status)} class="text-xs">
									Visible: {statusLabel(s.status)}
								</Badge>
								{#if s.isWinner}
									<Badge variant="success">
										Winner — pos {s.winnerPosition}
									</Badge>
								{/if}
								{#if !hasPayoutMethod}
									<Badge variant="destructive">No payment account</Badge>
								{/if}
							</div>
						</div>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-1 text-sm">
							<div>
								<span class="font-medium">Link:</span>
								<a href={s.link} target="_blank" rel="noopener noreferrer" class="underline">
									{s.link}
								</a>
							</div>
							{#if s.tweet}
								<div>
									<span class="font-medium">Tweet:</span>
									<a href={s.tweet} target="_blank" rel="noopener noreferrer" class="underline">
										{s.tweet}
									</a>
								</div>
							{/if}
							{#if s.ask != null}
								<div>
									<span class="font-medium">Ask:</span>
									{formatMoney(s.ask, bounty.currency)}
								</div>
							{/if}
						</div>

						{#if s.otherInfo}
							<div class="rounded-md border bg-zinc-50 p-3 text-sm">
								<div class="mb-1 text-xs font-medium text-zinc-500 uppercase">Additional info</div>
								<div>{@html s.otherInfo}</div>
							</div>
						{/if}

						{#if eligibilityQuestions.length > 0}
							<details class="rounded-md border p-3 text-sm">
								<summary class="cursor-pointer font-medium">Eligibility answers</summary>
								<ul class="mt-2 space-y-2">
									{#each eligibilityQuestions as q (q.question)}
										{@const answer = (
											s.eligibilityAnswers as Array<{
												question: string;
												answer: string;
											}> | null
										)?.find((a) => a.question === q.question)?.answer}
										<li>
											<div class="text-xs text-zinc-500">
												{q.question}{q.optional ? ' (optional)' : ''}
											</div>
											<div>{answer ?? '—'}</div>
										</li>
									{/each}
								</ul>
							</details>
						{/if}

						<div class="grid gap-3 sm:grid-cols-2">
							<form method="POST" action="?/label" use:enhance class="space-y-1">
								<Label for={`label-${s.id}`}>Label</Label>
								<input type="hidden" name="submissionId" value={s.id} />
								<div class="flex gap-2">
									<Select id={`label-${s.id}`} name="label" value={s.label} class="flex-1">
										{#each LABEL_VALUES as v (v)}
											<option value={v}>{v}</option>
										{/each}
									</Select>
									<Button type="submit" size="sm" variant="outline">Save</Button>
								</div>
							</form>

							{#if allowToggleWinner}
								<form method="POST" action="?/toggleWinner" use:enhance class="space-y-1">
									<Label for={`pos-${s.id}`}>Winner position</Label>
									<input type="hidden" name="submissionId" value={s.id} />
									{#if s.isWinner}
										<input type="hidden" name="isWinner" value="0" />
										<Button type="submit" size="sm" variant="outline" class="w-full text-red-600">
											Remove as winner
										</Button>
									{:else}
										<input type="hidden" name="isWinner" value="1" />
										<div class="flex gap-2">
											<Input
												id={`pos-${s.id}`}
												name="position"
												type="number"
												min="1"
												max="99"
												placeholder={bounty.type === 'PROJECT' ? '1' : '1–99'}
												class="flex-1"
											/>
											<Button type="submit" size="sm">Mark winner</Button>
										</div>
									{/if}
								</form>

								<div class="space-y-1">
									<Label>Freelancer-visible status</Label>
									<div class="flex gap-2">
										<form method="POST" action="?/shortlist" use:enhance>
											<input type="hidden" name="submissionId" value={s.id} />
											<Button
												type="submit"
												size="sm"
												variant={s.status === 'APPROVED' ? 'default' : 'outline'}
											>
												Shortlist
											</Button>
										</form>
										<form method="POST" action="?/reject" use:enhance>
											<input type="hidden" name="submissionId" value={s.id} />
											<Button
												type="submit"
												size="sm"
												variant={s.status === 'REJECTED' ? 'destructive' : 'outline'}
											>
												Reject
											</Button>
										</form>
									</div>
								</div>
							{/if}
						</div>

						<form method="POST" action="?/notes" use:enhance class="space-y-1">
							<Label for={`notes-${s.id}`}>Private notes (sponsor only)</Label>
							<input type="hidden" name="submissionId" value={s.id} />
							<Textarea id={`notes-${s.id}`} name="notes" rows={2} value={s.notes ?? ''} />
							<div class="flex justify-end">
								<Button type="submit" size="sm" variant="outline">Save notes</Button>
							</div>
						</form>

						<form method="POST" action="?/feedback" use:enhance class="space-y-1">
							<Label for={`fb-${s.id}`}>Feedback for the freelancer</Label>
							<input type="hidden" name="submissionId" value={s.id} />
							<Textarea id={`fb-${s.id}`} name="feedback" rows={2} value={s.feedback ?? ''} />
							<div class="flex justify-end">
								<Button type="submit" size="sm" variant="outline">Save feedback</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>
