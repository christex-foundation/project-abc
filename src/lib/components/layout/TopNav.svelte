<script lang="ts">
	import type { AuthedUser } from '$lib/server/auth-helpers';
	import { page } from '$app/state';
	import { cn, formatMoneyCompact } from '$lib/utils';
	import UserAvatar from '$lib/components/shared/UserAvatar.svelte';
	import { DropdownMenu, DropdownItem, DropdownSeparator } from '$lib/components/ui/dropdown-menu';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Sparkle from '@lucide/svelte/icons/sparkle';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import Plus from '@lucide/svelte/icons/plus';

	type WalletInfo = {
		creditsBalance: number | null;
		walletBalanceMinor: number | null;
		currencyDisplay: string;
	};

	type Props = {
		user: AuthedUser;
		isAdminHost: boolean;
		adminUrl?: string;
		wallet: WalletInfo;
	};

	let { user, isAdminHost, adminUrl = '', wallet }: Props = $props();

	let menuOpen = $state(false);

	const pathname = $derived(page.url.pathname);
	const isBountiesActive = $derived(pathname === '/' || pathname.startsWith('/bounties'));
	const isProjectsActive = $derived(pathname.startsWith('/projects'));
	const isDashboardActive = $derived(pathname.startsWith('/dashboard'));

	const profileHref = $derived(
		user.role === 'COMPANY' ? '/dashboard/company/profile' : '/dashboard/freelancer/profile'
	);
	const dashboardHref = $derived(
		user.role === 'COMPANY' ? '/dashboard/company' : '/dashboard/freelancer'
	);
	const seed = $derived(user.name ?? user.email);
	const initials = $derived(
		(user.name ?? user.email)
			.split(/[\s@]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((p) => p.charAt(0).toUpperCase())
			.join('') || 'F'
	);
</script>

<header class="border-bone bg-cream/85 sticky top-0 z-30 border-b backdrop-blur">
	<div class="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-5">
		<!-- Wordmark -->
		<a
			href="/"
			class="font-display text-ink text-2xl font-semibold tracking-tight"
			style="font-variation-settings: 'opsz' 144, 'wght' 700;"
		>
			fow<span class="text-terracotta">.</span>
		</a>

		<!-- Primary tabs (desktop only) -->
		<nav class="ml-2 hidden items-center gap-1 md:flex">
			<a href="/bounties" class={cn('fow-tab', isBountiesActive && 'fow-tab--active')}>
				Bounties
			</a>
			<a href="/projects" class={cn('fow-tab', isProjectsActive && 'fow-tab--active')}>
				Projects
			</a>
			<a href={dashboardHref} class={cn('fow-tab', isDashboardActive && 'fow-tab--active')}>
				Dashboard
			</a>
		</nav>

		<div class="ml-auto flex items-center gap-2 sm:gap-3">
			<!-- Companies-only Create CTA -->
			{#if user.role === 'COMPANY'}
				<a
					href="/bounties/create"
					class="bg-ink text-cream hover:bg-terracotta hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors sm:inline-flex"
				>
					<Plus class="h-4 w-4" />
					<span>Post work</span>
				</a>
			{/if}

			<!-- Credits chip (freelancers only) -->
			{#if user.role === 'FREELANCER' && wallet.creditsBalance != null}
				<a
					href="/dashboard/freelancer"
					class="border-bone bg-ochre-soft text-clay hover:border-ochre hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:inline-flex"
					title="Credits this period"
				>
					<Sparkle class="h-3.5 w-3.5" />
					<span class="font-mono tabular-nums">{wallet.creditsBalance}</span>
					<span class="text-clay/70">cr</span>
				</a>
			{/if}

			<!-- Wallet chip -->
			{#if wallet.walletBalanceMinor != null}
				<a
					href={user.role === 'COMPANY' ? '/dashboard/company' : '/dashboard/freelancer/earnings'}
					class="border-bone bg-forest-soft text-forest hover:border-forest hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:inline-flex"
					title="Available wallet balance"
				>
					<WalletIcon class="h-3.5 w-3.5" />
					<span class="font-mono tabular-nums">
						{formatMoneyCompact(wallet.walletBalanceMinor, wallet.currencyDisplay)}
					</span>
				</a>
			{/if}

			<!-- Avatar dropdown -->
			<DropdownMenu
				bind:open={menuOpen}
				onOpenChange={(v) => (menuOpen = v)}
				ariaLabel="Account menu"
			>
				{#snippet trigger({ open })}
					<span
						class={cn(
							'border-bone bg-paper inline-flex items-center gap-1.5 rounded-full border py-1 pr-2 pl-1 transition-colors',
							open ? 'border-ink' : 'hover:border-ink/40'
						)}
					>
						{#if user.role !== 'COMPANY'}
							<UserAvatar {seed} size={28} class="ring-bone ring-1" />
						{:else}
							<span
								class="bg-terracotta text-cream inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-semibold"
							>
								{initials}
							</span>
						{/if}
						<ChevronDown class="text-ink-soft h-3.5 w-3.5" />
					</span>
				{/snippet}

				<div class="px-2.5 pt-1 pb-2">
					<p class="text-ink-soft truncate text-xs">{user.email}</p>
					<p class="text-ink-soft/70 mt-0.5 text-[11px] tracking-wide uppercase">
						{user.role.toLowerCase()}
					</p>
				</div>

				{#if wallet.creditsBalance != null || wallet.walletBalanceMinor != null}
					<DropdownSeparator />
					{#if wallet.creditsBalance != null}
						<div
							class="text-ink-soft flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs sm:hidden"
						>
							<span class="inline-flex items-center gap-1.5">
								<Sparkle class="text-ochre h-3.5 w-3.5" />
								Credits
							</span>
							<span class="font-mono tabular-nums">{wallet.creditsBalance}</span>
						</div>
					{/if}
					{#if wallet.walletBalanceMinor != null}
						<div
							class="text-ink-soft flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs sm:hidden"
						>
							<span class="inline-flex items-center gap-1.5">
								<WalletIcon class="text-forest h-3.5 w-3.5" />
								Wallet
							</span>
							<span class="font-mono tabular-nums">
								{formatMoneyCompact(wallet.walletBalanceMinor, wallet.currencyDisplay)}
							</span>
						</div>
					{/if}
				{/if}

				<DropdownSeparator />
				<DropdownItem href={dashboardHref}>Dashboard</DropdownItem>
				<DropdownItem href={profileHref}>Profile</DropdownItem>
				<DropdownItem href="/notifications">Notifications</DropdownItem>
				<DropdownItem href="/settings/account">Account &amp; data</DropdownItem>
				<DropdownItem href="/settings/notifications">Notification settings</DropdownItem>

				{#if !isAdminHost && user.role === 'ADMIN' && adminUrl}
					<DropdownSeparator />
					<DropdownItem href={adminUrl}>Admin portal →</DropdownItem>
				{/if}

				<DropdownSeparator />
				<form method="POST" action="/logout">
					<button
						type="submit"
						class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-red-700 transition-colors hover:bg-red-50"
					>
						Sign out
					</button>
				</form>
			</DropdownMenu>
		</div>
	</div>
</header>

<style>
	:global(.fow-tab) {
		position: relative;
		padding: 0.4rem 0.85rem;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-ink-soft);
		transition:
			color 160ms ease,
			background-color 160ms ease;
	}
	:global(.fow-tab:hover) {
		color: var(--color-ink);
		background-color: var(--color-paper);
	}
	:global(.fow-tab--active) {
		color: var(--color-ink);
		background-color: var(--color-paper);
	}
	:global(.fow-tab--active::after) {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -0.95rem;
		transform: translateX(-50%);
		width: 0.35rem;
		height: 0.35rem;
		border-radius: 9999px;
		background-color: var(--color-terracotta);
	}
</style>
