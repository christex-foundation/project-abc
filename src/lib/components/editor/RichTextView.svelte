<!--
  Read-only renderer for sanitised HTML. The caller is responsible for passing
  already-sanitised HTML produced by sanitizeRichText() on the server. This
  component is a thin styling wrapper around `{@html sanitized}` per plan §13.
-->
<script lang="ts">
	type Props = { html: string; class?: string };
	let { html, class: className = '' }: Props = $props();
</script>

<div class={`prose prose-sm max-w-none ${className}`}>
	{@html html}
</div>
