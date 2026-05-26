<script lang="ts">
	import type { Snippet } from 'svelte';
	import PushPrompt from '$lib/components/push/PushPrompt.svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="mx-auto w-full max-w-5xl">
	{@render children()}
</div>
<PushPrompt />
