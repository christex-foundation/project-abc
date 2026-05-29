<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui';
</script>

<div class="mx-auto max-w-3xl space-y-6 px-2 py-6 md:px-0">
	<header>
		<h1 class="text-2xl font-semibold">Post work</h1>
		<p class="text-sm text-zinc-500">Choose how you want to engage freelancers.</p>
	</header>

	<div class="grid gap-4 sm:grid-cols-2">
		<a href="/bounties/create" class="block">
			<Card class="h-full transition-colors hover:border-zinc-900">
				<CardContent class="space-y-2 py-6">
					<span
						class="bg-terracotta-soft text-clay inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
					>
						Bounty
					</span>
					<h2 class="text-lg font-semibold">Run a competition</h2>
					<p class="text-sm text-zinc-600">
						Post a prize, many freelancers submit work, and you pick the winners. Best for one-off
						deliverables with a fixed or open reward.
					</p>
				</CardContent>
			</Card>
		</a>

		<a href="/projects/create" class="block">
			<Card class="h-full transition-colors hover:border-zinc-900">
				<CardContent class="space-y-2 py-6">
					<span
						class="bg-forest-soft text-forest inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
					>
						Project
					</span>
					<h2 class="text-lg font-semibold">Hire one contractor</h2>
					<p class="text-sm text-zinc-600">
						Set a budget, freelancers apply with a milestone proposal, and you award one. Work is
						delivered and paid milestone by milestone from escrow.
					</p>
				</CardContent>
			</Card>
		</a>
	</div>
</div>
