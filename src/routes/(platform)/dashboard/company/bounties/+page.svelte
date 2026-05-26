<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '$lib/components/ui';
	import RaiseDisputeButton from '$lib/components/shared/RaiseDisputeButton.svelte';

	let { data, form } = $props();

	function confirmCancel(e: Event, title: string, isDraft: boolean) {
		const msg = isDraft
			? `Discard "${title}"? This cannot be undone.`
			: `Cancel "${title}" and refund the escrow? Submitters will be notified.`;
		if (!confirm(msg)) {
			e.preventDefault();
		}
	}

	const statusOrder = ['DRAFT', 'FUNDED', 'ACTIVE', 'JUDGING', 'COMPLETED', 'CANCELLED'] as const;
	type Status = (typeof statusOrder)[number];

	const grouped = $derived.by(() => {
		const out: Record<Status, typeof data.bounties> = {
			DRAFT: [],
			FUNDED: [],
			ACTIVE: [],
			JUDGING: [],
			COMPLETED: [],
			CANCELLED: []
		};
		for (const b of data.bounties) (out[b.status as Status] ??= []).push(b);
		return out;
	});

	function badgeVariant(s: Status) {
		if (s === 'DRAFT') return 'secondary' as const;
		if (s === 'ACTIVE') return 'success' as const;
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
			<h1 class="text-2xl font-semibold">Your bounties</h1>
			<p class="text-sm text-zinc-500">Drafts, funded escrows, active campaigns.</p>
		</div>
		<Button href="/bounties/create">+ Create</Button>
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

	{#if data.bounties.length === 0}
		<Card>
			<CardContent class="py-12 text-center text-zinc-500">
				No bounties yet. <a href="/bounties/create" class="underline">Create your first one</a>.
			</CardContent>
		</Card>
	{:else}
		{#each statusOrder as s (s)}
			{#if grouped[s].length > 0}
				<section class="space-y-2">
					<h2 class="text-sm font-semibold text-zinc-500 uppercase">{s}</h2>
					<div class="grid gap-3 sm:grid-cols-2">
						{#each grouped[s] as b (b.id)}
							<Card>
								<CardHeader>
									<div class="flex items-center justify-between">
										<Badge variant={badgeVariant(s)}>{s}</Badge>
										<Badge variant="outline">{b.type}</Badge>
									</div>
									<CardTitle class="line-clamp-2 text-base">{b.title}</CardTitle>
								</CardHeader>
								<CardContent class="space-y-3">
									<div class="flex items-center justify-between">
										<span class="text-sm font-medium"
											>{formatMoney(b.totalPrizePool, b.currency)}</span
										>
										<Button size="sm" variant="outline" href={`/bounties/${b.slug}`}>
											{s === 'DRAFT' ? 'Preview' : 'View'}
										</Button>
									</div>

									{#if s === 'DRAFT'}
										<div class="flex gap-2">
											<Button
												size="sm"
												class="flex-1"
												href={`/dashboard/company/bounties/${b.id}/fund`}
											>
												Fund
											</Button>
											<form
												method="POST"
												action="?/cancel"
												use:enhance
												onsubmit={(e) => confirmCancel(e, b.title, true)}
												class="flex-1"
											>
												<input type="hidden" name="bountyId" value={b.id} />
												<Button
													size="sm"
													variant="outline"
													type="submit"
													class="w-full text-red-600"
												>
													Discard
												</Button>
											</form>
										</div>
									{:else if s === 'FUNDED'}
										<div class="flex gap-2">
											<form method="POST" action="?/publish" use:enhance class="flex-1">
												<input type="hidden" name="bountyId" value={b.id} />
												<Button size="sm" type="submit" class="w-full">Publish</Button>
											</form>
											<form
												method="POST"
												action="?/cancel"
												use:enhance
												onsubmit={(e) => confirmCancel(e, b.title, false)}
												class="flex-1"
											>
												<input type="hidden" name="bountyId" value={b.id} />
												<Button
													size="sm"
													variant="outline"
													type="submit"
													class="w-full text-red-600"
												>
													Cancel &amp; refund
												</Button>
											</form>
										</div>
									{:else if s === 'ACTIVE' || s === 'JUDGING' || s === 'COMPLETED'}
										<div class="flex gap-2">
											<Button
												size="sm"
												variant="outline"
												class="flex-1"
												href={`/dashboard/company/bounties/${b.id}/submissions`}
											>
												Submissions
											</Button>
											{#if s !== 'COMPLETED'}
												<form
													method="POST"
													action="?/cancel"
													use:enhance
													onsubmit={(e) => confirmCancel(e, b.title, false)}
													class="flex-1"
												>
													<input type="hidden" name="bountyId" value={b.id} />
													<Button
														size="sm"
														variant="outline"
														type="submit"
														class="w-full text-red-600"
													>
														Cancel &amp; refund
													</Button>
												</form>
											{/if}
										</div>
									{/if}

									{#if s === 'JUDGING' || s === 'COMPLETED'}
										<div class="flex justify-end">
											<RaiseDisputeButton bountyId={b.id} bountyTitle={b.title} />
										</div>
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
