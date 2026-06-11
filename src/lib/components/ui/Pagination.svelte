<script lang="ts">
	import { goto } from '$app/navigation';
	import { page as pageState } from '$app/state';
	import Button from './Button.svelte';

	// URL-driven pagination — writes `?page=N` and lets the load function re-run,
	// keeping pages bookmarkable and back/forward-friendly (the pattern the public
	// bounty/project feeds already use).
	type Props = { page: number; pageSize: number; total: number };
	let { page, pageSize, total }: Props = $props();

	const totalPages = $derived(Math.max(1, Math.ceil(total / Math.max(1, pageSize))));

	function go(p: number) {
		const params = new URLSearchParams(pageState.url.searchParams);
		params.set('page', String(p));
		goto(`?${params.toString()}`, { keepFocus: true });
	}
</script>

{#if totalPages > 1}
	<nav class="flex items-center justify-between gap-2 pt-2" aria-label="Pagination">
		<Button variant="outline" size="sm" disabled={page <= 1} onclick={() => go(page - 1)}>
			Previous
		</Button>
		<span class="text-ink-soft text-xs">
			Page {page} of {totalPages} · {total} total
		</span>
		<Button variant="outline" size="sm" disabled={page >= totalPages} onclick={() => go(page + 1)}>
			Next
		</Button>
	</nav>
{/if}
