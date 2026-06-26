<script lang="ts">
	// Dumb avatar: the SVG is generated server-side (see `$lib/server/avatar`)
	// and passed in as a data-URI `src`, so the ~275 KB DiceBear library stays
	// out of the client bundle (mobile-first initial-JS budget — see CLAUDE.md).
	type Props = { src: string; size?: number; alt?: string; class?: string };
	let { src, size = 32, alt = '', class: cls = '' }: Props = $props();
</script>

<img
	{src}
	{alt}
	width={size}
	height={size}
	style="width:{size}px;height:{size}px"
	class="shrink-0 rounded-full object-cover {cls}"
/>
