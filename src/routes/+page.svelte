<script lang="ts">
	let { data } = $props();
</script>

<section class="space-y-12 py-8">
	<header class="space-y-4 text-center">
		<h1 class="text-4xl font-semibold tracking-tight md:text-5xl">
			Work that pays — in Sierra Leone.
		</h1>
		<p class="mx-auto max-w-2xl text-lg text-zinc-600">
			Companies post bounties; freelancers compete to win. Escrowed funds, mobile-money payouts, no
			platform fees while we build.
		</p>
		<div class="flex justify-center gap-3">
			<a href="/bounties" class="rounded bg-zinc-900 px-5 py-2 text-white">Browse bounties</a>
			{#if !data.user}
				<a href="/register" class="rounded border border-zinc-300 px-5 py-2">Get started</a>
			{/if}
		</div>
	</header>

	<section class="grid gap-6 md:grid-cols-3">
		<article class="rounded border border-zinc-200 bg-white p-5">
			<h3 class="font-semibold">For freelancers</h3>
			<p class="mt-2 text-sm text-zinc-600">
				Pick bounties matched to your skills. Submit a link. Get paid via Afrimoney / Orange Money /
				bank.
			</p>
		</article>
		<article class="rounded border border-zinc-200 bg-white p-5">
			<h3 class="font-semibold">For companies</h3>
			<p class="mt-2 text-sm text-zinc-600">
				Post a bounty, fund it once, pick winners. Monime escrow holds the prize pool until you
				announce.
			</p>
		</article>
		<article class="rounded border border-zinc-200 bg-white p-5">
			<h3 class="font-semibold">Built for the market</h3>
			<p class="mt-2 text-sm text-zinc-600">
				Mobile-first. Works on patchy connections. Auto-saves drafts so a power cut doesn't cost you
				the brief.
			</p>
		</article>
	</section>
</section>
