<script lang="ts">
	import { page } from '$app/state';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Users from '@lucide/svelte/icons/users';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Tag from '@lucide/svelte/icons/tag';
	import MailPlus from '@lucide/svelte/icons/mail-plus';
	import Settings from '@lucide/svelte/icons/settings';
	import type { Component } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = {
		badges: {
			openDisputes: number;
			pendingInvites: number;
			failedPayments: number;
		};
		// Called when a nav link is clicked — used by the mobile drawer to close.
		onNavigate?: () => void;
	};

	let { badges, onNavigate }: Props = $props();

	type NavItem = {
		href: string;
		label: string;
		icon: Component;
		badge?: number;
		exact?: boolean;
	};

	type NavSection = { label: string; items: NavItem[] };

	const sections: NavSection[] = $derived([
		{
			label: 'Operations',
			items: [
				{ href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
				{ href: '/admin/bounties', label: 'Bounties', icon: Briefcase },
				{ href: '/admin/users', label: 'Users', icon: Users },
				{ href: '/admin/admins', label: 'Admins', icon: ShieldCheck },
				{
					href: '/admin/payments',
					label: 'Payments',
					icon: CreditCard,
					badge: badges.failedPayments || undefined
				},
				{
					href: '/admin/disputes',
					label: 'Disputes',
					icon: AlertTriangle,
					badge: badges.openDisputes || undefined
				}
			]
		},
		{
			label: 'Configuration',
			items: [
				{ href: '/admin/skills', label: 'Skills', icon: Tag },
				{
					href: '/admin/invites',
					label: 'Invites',
					icon: MailPlus,
					badge: badges.pendingInvites || undefined
				},
				{ href: '/admin/settings', label: 'Settings', icon: Settings }
			]
		}
	]);

	function isActive(item: NavItem): boolean {
		const path = page.url.pathname;
		if (item.exact) return path === item.href;
		return path === item.href || path.startsWith(`${item.href}/`);
	}
</script>

<div class="flex h-full flex-col bg-zinc-950 text-zinc-200">
	<div class="border-b border-zinc-800 px-5 py-4">
		<a href="/admin" class="flex items-center gap-2" onclick={onNavigate}>
			<span
				class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500 text-xs font-bold text-white"
			>
				FOW
			</span>
			<div class="leading-tight">
				<p class="text-sm font-semibold text-white">Admin</p>
				<p class="text-[10px] tracking-wider text-zinc-500 uppercase">Operations console</p>
			</div>
		</a>
	</div>

	<nav class="flex-1 overflow-y-auto px-3 py-4">
		{#each sections as section (section.label)}
			<div class="mb-5">
				<p class="mb-2 px-2 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
					{section.label}
				</p>
				<ul class="space-y-0.5">
					{#each section.items as item (item.href)}
						{@const active = isActive(item)}
						<li>
							<a
								href={item.href}
								onclick={onNavigate}
								class={cn(
									'group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
									active
										? 'bg-indigo-500/15 text-white ring-1 ring-indigo-500/30 ring-inset'
										: 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
								)}
							>
								<item.icon class={cn('h-4 w-4', active ? 'text-indigo-300' : 'text-zinc-500')} />
								<span class="flex-1 truncate">{item.label}</span>
								{#if item.badge}
									<span
										class="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-200 ring-1 ring-amber-500/30 ring-inset"
									>
										{item.badge}
									</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</nav>

	<div class="border-t border-zinc-800 px-3 py-3">
		<a
			href="/"
			onclick={onNavigate}
			class="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
		>
			← Back to platform
		</a>
	</div>
</div>
