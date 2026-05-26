<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/layout/Header.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import { MetaTags } from 'svelte-meta-tags';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';

	let { data, children } = $props();

	// The admin shell already renders its own sidebar inside admin/+layout.svelte
	// so we suppress this root-level sidebar on /admin/* to avoid stacking.
	const showSidebar = $derived(data.user && !page.url.pathname.startsWith('/admin'));
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

<div class="min-h-screen bg-zinc-50 text-zinc-900">
	<Header user={data.user} isAdminHost={data.isAdminHost} adminUrl={env.PUBLIC_ADMIN_URL} />
	<div class="mx-auto flex max-w-6xl gap-6 px-4 py-6 pb-24 md:pb-6">
		{#if showSidebar}
			<Sidebar user={data.user} isAdminHost={data.isAdminHost} />
		{/if}
		<main class="flex-1">
			{@render children()}
		</main>
	</div>
	<BottomNav user={data.user} />
</div>
