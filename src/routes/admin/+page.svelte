<script lang="ts">
	let { data } = $props();
</script>

<h1 class="text-2xl font-semibold">Admin</h1>
<p class="mt-2 text-sm text-zinc-600">Signed in as {data.user?.email}.</p>

<div class="mt-6 grid gap-4 md:grid-cols-2">
	<a class="rounded border border-zinc-200 bg-white p-5 hover:bg-zinc-50" href="/admin/settings">
		<h2 class="font-semibold">Settings</h2>
		<p class="text-sm text-zinc-600">Platform toggles, including company self-register.</p>
	</a>
	<a class="rounded border border-zinc-200 bg-white p-5 hover:bg-zinc-50" href="/admin/invites">
		<h2 class="font-semibold">Invites</h2>
		<p class="text-sm text-zinc-600">Invite a company by email.</p>
	</a>
</div>
