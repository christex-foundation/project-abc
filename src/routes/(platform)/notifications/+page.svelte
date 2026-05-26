<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let { data } = $props();

	let busy = $state(false);
	let errorMsg = $state<string | null>(null);

	type Row = (typeof data.notifications)[number];

	function dayKey(d: Date | string): string {
		const dt = new Date(d);
		const today = new Date();
		const yesterday = new Date();
		yesterday.setDate(today.getDate() - 1);
		const fmt = (x: Date) => x.toISOString().slice(0, 10);
		if (fmt(dt) === fmt(today)) return 'Today';
		if (fmt(dt) === fmt(yesterday)) return 'Yesterday';
		return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const grouped = $derived.by(() => {
		const groups = new Map<string, Row[]>();
		for (const n of data.notifications) {
			const k = dayKey(n.createdAt);
			if (!groups.has(k)) groups.set(k, []);
			groups.get(k)!.push(n);
		}
		return Array.from(groups.entries());
	});

	const unreadCount = $derived(data.notifications.filter((n) => !n.isRead).length);

	async function markRead(id: string) {
		try {
			await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id, isRead: true })
			});
		} catch (e) {
			console.error('[notifications] mark read failed', e);
		}
	}

	async function onRowClick(n: Row) {
		if (!n.isRead) await markRead(n.id);
		await invalidateAll();
	}

	async function markAllRead() {
		busy = true;
		errorMsg = null;
		try {
			const unread = data.notifications.filter((n) => !n.isRead);
			await Promise.all(
				unread.map((n) =>
					fetch('/api/notifications', {
						method: 'PATCH',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ id: n.id, isRead: true })
					})
				)
			);
			await invalidateAll();
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Could not mark all read.';
		} finally {
			busy = false;
		}
	}

	function eventLabel(eventType: string): string {
		const map: Record<string, string> = {
			BOUNTY_FUNDED: 'Funded',
			BOUNTY_PUBLISHED: 'Published',
			BOUNTY_CANCELLED: 'Cancelled',
			SUBMISSION_RECEIVED: 'New submission',
			SUBMISSION_SHORTLISTED: 'Shortlisted',
			WINNERS_ANNOUNCED: 'Winners',
			PAYOUT_COMPLETED: 'Payout',
			PAYOUT_FAILED: 'Payout failed',
			DISPUTE_RAISED: 'Dispute',
			DISPUTE_RESOLVED: 'Dispute'
		};
		return map[eventType] ?? eventType.replaceAll('_', ' ').toLowerCase();
	}

	function fmtTime(d: Date | string): string {
		return new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="space-y-6">
	<header class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold">Notifications</h1>
			<p class="text-sm text-zinc-500">
				{unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}
			</p>
		</div>
		{#if unreadCount > 0}
			<button
				type="button"
				onclick={markAllRead}
				disabled={busy}
				class="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
			>
				{busy ? 'Working…' : 'Mark all read'}
			</button>
		{/if}
	</header>

	{#if errorMsg}
		<p class="text-sm text-red-600">{errorMsg}</p>
	{/if}

	{#if data.notifications.length === 0}
		<EmptyState
			title="No notifications yet"
			description="You'll see bounty updates, submission events, and payouts here."
		/>
	{:else}
		<div class="space-y-6">
			{#each grouped as [day, rows] (day)}
				<section class="space-y-2">
					<h2 class="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{day}</h2>
					<ul class="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
						{#each rows as n (n.id)}
							<li>
								{#if n.link}
									<a
										href={n.link}
										onclick={() => onRowClick(n)}
										class="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50"
									>
										<span
											class={`mt-2 inline-block h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-zinc-900'}`}
											aria-label={n.isRead ? 'Read' : 'Unread'}
										></span>
										<div class="min-w-0 flex-1">
											<div class="flex items-baseline justify-between gap-3">
												<p class="truncate text-sm font-medium text-zinc-900">{n.title}</p>
												<span class="shrink-0 text-xs text-zinc-400">{fmtTime(n.createdAt)}</span>
											</div>
											{#if n.message}
												<p class="mt-0.5 text-sm text-zinc-600">{n.message}</p>
											{/if}
											<p class="mt-1 text-xs text-zinc-400">{eventLabel(n.eventType)}</p>
										</div>
									</a>
								{:else}
									<button
										type="button"
										onclick={() => onRowClick(n)}
										class="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50"
									>
										<span
											class={`mt-2 inline-block h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-zinc-900'}`}
											aria-label={n.isRead ? 'Read' : 'Unread'}
										></span>
										<div class="min-w-0 flex-1">
											<div class="flex items-baseline justify-between gap-3">
												<p class="truncate text-sm font-medium text-zinc-900">{n.title}</p>
												<span class="shrink-0 text-xs text-zinc-400">{fmtTime(n.createdAt)}</span>
											</div>
											{#if n.message}
												<p class="mt-0.5 text-sm text-zinc-600">{n.message}</p>
											{/if}
											<p class="mt-1 text-xs text-zinc-400">{eventLabel(n.eventType)}</p>
										</div>
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</div>
