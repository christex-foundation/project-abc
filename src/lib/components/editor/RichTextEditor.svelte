<!--
  Phase 1 shell. The real ProseKit-backed toolbar lands in Phase 2 when the
  bounty-creation wizard ships (plan §13). The component API is fixed now so
  callers don't churn: `value` (bindable HTML string), `placeholder`, `label`.

  Until Phase 2, the underlying control is a textarea. Sanitisation is the
  server's responsibility (sanitizeRichText) — never trust this component's
  output on writes.
-->
<script lang="ts">
	type Props = {
		value: string;
		placeholder?: string;
		label?: string;
		name?: string;
		id?: string;
		rows?: number;
		disabled?: boolean;
	};

	let {
		value = $bindable(''),
		placeholder = '',
		label = '',
		name,
		id,
		rows = 8,
		disabled = false
	}: Props = $props();
</script>

<div class="rich-text-editor">
	{#if label}
		<label class="mb-1 block text-sm font-medium" for={id}>{label}</label>
	{/if}
	<textarea
		{id}
		{name}
		{placeholder}
		{rows}
		{disabled}
		bind:value
		class="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
	></textarea>
	<p class="mt-1 text-xs text-zinc-500">Plain text for now. Rich formatting lands in Phase 2.</p>
</div>
