<script lang="ts">
	import { enhance } from '$app/forms';
	import { SvelteSet } from 'svelte/reactivity';
	import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '$lib/components/ui';
	import RaiseDisputeButton from '$lib/components/shared/RaiseDisputeButton.svelte';
	import { trackSubmit } from '$lib/client/forms';
	import { PROVINCE_LABEL } from '$lib/constants/geo';
	import Lock from '@lucide/svelte/icons/lock';

	let { data, form } = $props();

	const busy = new SvelteSet<string>();
	const submitFor = (key: string) => trackSubmit((v) => (v ? busy.add(key) : busy.delete(key)));

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
			<h1 class="fow-display text-ink text-3xl">Your bounties</h1>
			<p class="text-ink-soft mt-1 text-sm">Drafts, funded escrows, and active campaigns.</p>
		</div>
		<Button href="/bounties/create">+ Create</Button>
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

	{#if data.bounties.length === 0}
		<Card>
			<CardContent class="text-ink-soft py-12 text-center">
				No bounties yet. <a href="/bounties/create" class="underline">Create your first one</a>.
			</CardContent>
		</Card>
	{:else}
		{#each statusOrder as s (s)}
			{#if grouped[s].length > 0}
				<section class="space-y-2">
					<h2 class="text-ink-soft font-mono text-xs font-semibold tracking-wide uppercase">{s}</h2>
					<div class="grid gap-3 sm:grid-cols-2">
						{#each grouped[s] as b (b.id)}
							<Card>
								<CardHeader>
									<div class="flex items-center justify-between">
										<Badge variant={badgeVariant(s)}>{s}</Badge>
										<Badge variant="outline">{b.type}</Badge>
									</div>
									<CardTitle class="line-clamp-2 text-base">{b.title}</CardTitle>
									{#if b.isPinLocked || b.targetProvinces.length > 0}
										<div class="flex flex-wrap items-center gap-1 pt-1">
											{#if b.isPinLocked}
												<Badge variant="secondary"><Lock class="mr-1 h-3 w-3" />PIN</Badge>
											{/if}
											{#each b.targetProvinces as p (p)}
												<Badge variant="outline">{PROVINCE_LABEL[p]}</Badge>
											{/each}
										</div>
									{/if}
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
												variant="outline"
												class="flex-1"
												href={`/dashboard/company/bounties/${b.id}/edit`}
											>
												Edit
											</Button>
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
												use:enhance={submitFor(`${b.id}:cancel`)}
												onsubmit={(e) => confirmCancel(e, b.title, true)}
												class="flex-1"
											>
												<input type="hidden" name="bountyId" value={b.id} />
												<Button
													size="sm"
													variant="outline"
													type="submit"
													disabled={busy.has(`${b.id}:cancel`)}
													class="w-full text-red-600"
												>
													{busy.has(`${b.id}:cancel`) ? 'Discarding…' : 'Discard'}
												</Button>
											</form>
										</div>
									{:else if s === 'FUNDED'}
										<div class="flex gap-2">
											<form
												method="POST"
												action="?/publish"
												use:enhance={submitFor(`${b.id}:publish`)}
												class="flex-1"
											>
												<input type="hidden" name="bountyId" value={b.id} />
												<Button
													size="sm"
													type="submit"
													disabled={busy.has(`${b.id}:publish`)}
													class="w-full"
												>
													{busy.has(`${b.id}:publish`) ? 'Publishing…' : 'Publish'}
												</Button>
											</form>
											<form
												method="POST"
												action="?/cancel"
												use:enhance={submitFor(`${b.id}:cancel`)}
												onsubmit={(e) => confirmCancel(e, b.title, false)}
												class="flex-1"
											>
												<input type="hidden" name="bountyId" value={b.id} />
												<Button
													size="sm"
													variant="outline"
													type="submit"
													disabled={busy.has(`${b.id}:cancel`)}
													class="w-full text-red-600"
												>
													{busy.has(`${b.id}:cancel`) ? 'Cancelling…' : 'Cancel & refund'}
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
													use:enhance={submitFor(`${b.id}:cancel`)}
													onsubmit={(e) => confirmCancel(e, b.title, false)}
													class="flex-1"
												>
													<input type="hidden" name="bountyId" value={b.id} />
													<Button
														size="sm"
														variant="outline"
														type="submit"
														disabled={busy.has(`${b.id}:cancel`)}
														class="w-full text-red-600"
													>
														{busy.has(`${b.id}:cancel`) ? 'Cancelling…' : 'Cancel & refund'}
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
