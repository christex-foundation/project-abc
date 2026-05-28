<script lang="ts">
	import type { AuthedUser } from '$lib/server/auth-helpers';
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import Compass from '@lucide/svelte/icons/compass';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Bell from '@lucide/svelte/icons/bell';
	import User from '@lucide/svelte/icons/user';

	type Props = { user: AuthedUser | null };
	let { user }: Props = $props();

	const dashboardHref = $derived(
		user?.role === 'COMPANY' ? '/dashboard/company' : '/dashboard/freelancer'
	);
	const profileHref = $derived(
		user?.role === 'COMPANY' ? '/dashboard/company/profile' : '/dashboard/freelancer/profile'
	);
	const pathname = $derived(page.url.pathname);

	const tabs = $derived([
		{
			label: 'Browse',
			href: '/bounties',
			icon: Compass,
			active:
				pathname === '/' || pathname.startsWith('/bounties') || pathname.startsWith('/projects')
		},
		{
			label: 'Dashboard',
			href: dashboardHref,
			icon: LayoutDashboard,
			active: pathname.startsWith('/dashboard')
		},
		{
			label: 'Inbox',
			href: '/notifications',
			icon: Bell,
			active: pathname.startsWith('/notifications')
		},
		{
			label: 'Profile',
			href: profileHref,
			icon: User,
			active: pathname.startsWith('/settings') || pathname.endsWith('/profile')
		}
	]);
</script>

{#if user}
	<nav
		class="border-bone bg-cream/90 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur md:hidden"
	>
		<div class="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
			{#each tabs as t (t.href)}
				<a
					href={t.href}
					class={cn(
						'flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors',
						t.active ? 'text-ink' : 'text-ink-soft hover:text-ink'
					)}
				>
					<t.icon class={cn('h-4 w-4', t.active && 'text-terracotta')} />
					{t.label}
				</a>
			{/each}
		</div>
	</nav>
{/if}
