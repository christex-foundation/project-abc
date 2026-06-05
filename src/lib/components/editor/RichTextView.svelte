<!--
  Read-only renderer for sanitised HTML. The caller is responsible for passing
  HTML that has already gone through `sanitizeRichText` on the server — this
  component is a thin styling wrapper around `{@html sanitized}` (plan §13).
  Never feed it raw user input.
-->
<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = { html: string | null | undefined; class?: string };
	let { html, class: className }: Props = $props();
</script>

<div
	class={cn(
		'prose prose-sm text-ink prose-headings:text-ink prose-strong:text-ink prose-a:text-terracotta prose-a:no-underline hover:prose-a:underline prose-hr:border-bone prose-blockquote:border-bone prose-blockquote:text-ink-soft prose-code:text-ink max-w-none',
		className
	)}
>
	{@html html ?? ''}
</div>
