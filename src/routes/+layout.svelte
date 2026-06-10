<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/layout/Header.svelte';
	import TopNav from '$lib/components/layout/TopNav.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import { MetaTags } from 'svelte-meta-tags';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { Toaster, toast } from 'svelte-sonner';

	let { data, children } = $props();

	// Passive connectivity indicator — a thin banner while offline, plus a toast on
	// each transition. Crucial on the flaky mobile networks FOW targets so a failed
	// action reads as "you're offline" rather than "the app is broken".
	let online = $state(true);
	$effect(() => {
		online = navigator.onLine;
		const goOffline = () => {
			online = false;
			toast.error("You're offline", { description: 'Changes may not save until you reconnect.' });
		};
		const goOnline = () => {
			online = true;
			toast.success('Back online');
		};
		window.addEventListener('offline', goOffline);
		window.addEventListener('online', goOnline);
		return () => {
			window.removeEventListener('offline', goOffline);
			window.removeEventListener('online', goOnline);
		};
	});

	// Admin lives on a separate subdomain (CLAUDE.md hard rule) and uses its own
	// chrome — suppress the public shell on admin paths.
	const isAdminPath = $derived(page.url.pathname.startsWith('/admin'));
	const showTopNav = $derived(!!data.user && !isAdminPath);

	const wallet = $derived(
		data.wallet ?? {
			creditsBalance: null,
			walletBalanceMinor: null,
			currencyDisplay: 'Le',
			withdrawalDestination: null
		}
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
</svelte:head>

<MetaTags
	title="FOW — Future of Work"
	titleTemplate="%s · FOW"
	description="Bounty platform for Sierra Leone. Companies post paid work; freelancers compete to win."
	canonical={env.PUBLIC_APP_URL}
	openGraph={{
		type: 'website',
		siteName: 'FOW — Future of Work',
		locale: 'en_SL'
	}}
	robots={data.isAdminHost ? 'noindex, nofollow' : undefined}
/>

{#if isAdminPath}
	{@render children()}
{:else}
	<div class="bg-cream text-ink min-h-screen overflow-x-clip font-sans">
		{#if showTopNav && data.user}
			<TopNav
				user={data.user}
				avatarSrc={data.userAvatar}
				isAdminHost={data.isAdminHost}
				adminUrl={env.PUBLIC_ADMIN_URL}
				{wallet}
			/>
		{:else}
			<Header user={data.user} isAdminHost={data.isAdminHost} adminUrl={env.PUBLIC_ADMIN_URL} />
		{/if}
		<main class="mx-auto max-w-6xl px-4 pt-6 pb-24 md:pb-10">
			{@render children()}
		</main>
		<BottomNav user={data.user} />
	</div>
{/if}

{#if !online}
	<div
		role="status"
		class="bg-ink text-cream fixed inset-x-0 top-0 z-50 px-4 py-1.5 text-center text-xs font-medium"
	>
		You're offline — changes may not save until you reconnect.
	</div>
{/if}

<Toaster richColors position="top-right" />
