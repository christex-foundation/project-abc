<script lang="ts">
	import { createAvatar } from '@dicebear/core';
	import { adventurer } from '@dicebear/collection';

	type Props = { seed: string; size?: number; class?: string };
	let { seed, size = 32, class: cls = '' }: Props = $props();

	const src = $derived(
		'data:image/svg+xml;utf8,' +
			encodeURIComponent(createAvatar(adventurer, { seed, size }).toString())
	);
</script>

<img {src} alt={seed} width={size} height={size} class="rounded-full {cls}" />
