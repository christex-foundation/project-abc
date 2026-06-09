<script lang="ts">
	import { page } from '$app/state';
	import AlertOctagon from '@lucide/svelte/icons/alert-octagon';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Menu from '@lucide/svelte/icons/menu';
	import type { AuthedUser } from '$lib/server/auth-helpers';

	type Props = {
		user: AuthedUser | null;
		featureFlags: {
			maintenanceMode?: boolean;
			maintenanceMessage?: string;
		};
		// Opens the mobile nav drawer (shown only below md).
		onMenuClick?: () => void;
	};

	let { user, featureFlags, onMenuClick }: Props = $props();

	type Crumb = { label: string; href: string };

	const crumbs = $derived.by<Crumb[]>(() => {
		const parts = page.url.pathname.split('/').filter(Boolean);
		if (parts.length === 0 || parts[0] !== 'admin') return [];
		const out: Crumb[] = [{ label: 'Admin', href: '/admin' }];
		let acc = '/admin';
		for (let i = 1; i < parts.length; i++) {
			acc += `/${parts[i]}`;
			const label = parts[i].length > 16 ? `${parts[i].slice(0, 14)}…` : parts[i];
			out.push({ label: label.replaceAll('-', ' '), href: acc });
		}
		return out;
	});

	const initials = $derived.by(() => {
		const name = user?.name ?? user?.email ?? '';
		const parts = name.split(/[\s@.]/).filter(Boolean);
		return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
	});
</script>

<div class="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
	{#if featureFlags.maintenanceMode}
		<div
			class="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-1.5 text-xs text-amber-900"
		>
			<AlertOctagon class="h-3.5 w-3.5" />
			<span class="font-medium">Maintenance mode is ON.</span>
			{#if featureFlags.maintenanceMessage}
				<span class="text-amber-800">— {featureFlags.maintenanceMessage}</span>
			{/if}
		</div>
	{/if}
	<div class="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
		<button
			type="button"
			onclick={onMenuClick}
			aria-label="Open navigation menu"
			class="-ml-1 rounded-md p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 md:hidden"
		>
			<Menu class="h-5 w-5" />
		</button>
		<nav aria-label="Breadcrumb" class="flex min-w-0 items-center gap-1 text-xs text-zinc-500">
			{#each crumbs as crumb, i (crumb.href)}
				{#if i > 0}
					<span class="text-zinc-300">/</span>
				{/if}
				{#if i === crumbs.length - 1}
					<span class="truncate font-medium text-zinc-900 capitalize">{crumb.label}</span>
				{:else}
					<a class="truncate capitalize hover:text-zinc-900" href={crumb.href}>{crumb.label}</a>
				{/if}
			{/each}
		</nav>
		<div class="flex items-center gap-3">
			{#if user}
				<div
					class="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pr-3 pl-1"
				>
					<span
						class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white"
					>
						{initials}
					</span>
					<div class="text-xs leading-tight">
						<p class="font-medium text-zinc-900">{user.name ?? user.email}</p>
						<p class="text-[10px] tracking-wide text-zinc-500 uppercase">Admin</p>
					</div>
				</div>
				<form method="POST" action="/logout">
					<button
						type="submit"
						aria-label="Sign out"
						class="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
					>
						<LogOut class="h-4 w-4" />
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>
