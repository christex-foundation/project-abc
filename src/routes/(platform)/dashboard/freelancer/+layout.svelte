<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/utils';

	let { children } = $props();

	const pathname = $derived(page.url.pathname);

	const tabs = $derived([
		{
			label: 'Overview',
			href: '/dashboard/freelancer',
			active: pathname === '/dashboard/freelancer'
		},
		{
			label: 'My Work',
			href: '/dashboard/freelancer/submissions',
			active:
				pathname.startsWith('/dashboard/freelancer/submissions') ||
				pathname.startsWith('/dashboard/freelancer/proposals')
		},
		{
			label: 'Earnings',
			href: '/dashboard/freelancer/earnings',
			active: pathname.startsWith('/dashboard/freelancer/earnings')
		},
		{
			label: 'Profile',
			href: '/dashboard/freelancer/profile',
			active: pathname.startsWith('/dashboard/freelancer/profile')
		}
	]);
</script>

<div class="space-y-6">
	<nav
		class="border-bone -mx-1 flex items-center gap-1 overflow-x-auto border-b px-1 whitespace-nowrap"
		aria-label="Freelancer dashboard"
	>
		{#each tabs as t (t.href)}
			<a
				href={t.href}
				aria-current={t.active ? 'page' : undefined}
				class={cn('fow-subtab', t.active && 'fow-subtab--active')}
			>
				{t.label}
			</a>
		{/each}
	</nav>

	{@render children()}
</div>

<style>
	.fow-subtab {
		position: relative;
		padding: 0.55rem 0.85rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-ink-soft);
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition:
			color 160ms ease,
			border-color 160ms ease;
	}
	.fow-subtab:hover {
		color: var(--color-ink);
	}
	.fow-subtab--active {
		color: var(--color-ink);
		border-bottom-color: var(--color-terracotta);
	}
</style>
