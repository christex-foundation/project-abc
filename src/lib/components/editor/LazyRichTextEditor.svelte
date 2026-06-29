<!--
  Lazy wrapper around RichTextEditor. ProseKit (+ extensions) is ~30-50KB gzipped;
  this keeps that chunk out of the initial download on form-heavy pages (bounty
  create/submit, project create/apply) which matters on the 3G connections Learn2Earn
  targets. A drop-in replacement — same props as RichTextEditor.

  Strategy:
   - Empty field (the common "create" case): show a lightweight stand-in and load
     the real editor on first interaction; also warm it during idle time so it's
     ready by the time the user taps in.
   - Pre-filled field (edit / restored draft): the existing content must be
     visible, so load the editor immediately.
-->
<script lang="ts">
	import type { Component } from 'svelte';
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = {
		initialHTML?: string;
		placeholder?: string;
		onChange?: (html: string) => void;
		class?: string;
		disabled?: boolean;
	};

	let props: Props = $props();

	let Editor = $state<Component<Props> | null>(null);
	let loading = false;

	async function load() {
		if (Editor || loading) return;
		loading = true;
		const mod = await import('./RichTextEditor.svelte');
		Editor = mod.default;
	}

	onMount(() => {
		// Pre-filled fields must render their content right away.
		if (props.initialHTML && props.initialHTML.trim()) {
			load();
			return;
		}
		// Empty field: warm the chunk when the browser is idle so the first tap
		// feels instant, without competing with first paint.
		const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
			.requestIdleCallback;
		if (ric) {
			const id = ric(() => load());
			return () =>
				(window as Window & { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(id);
		}
		const t = setTimeout(load, 2000);
		return () => clearTimeout(t);
	});
</script>

{#if Editor}
	<Editor {...props} />
{:else}
	<!-- Stand-in shown only briefly for empty fields until the editor chunk loads. -->
	<button
		type="button"
		onpointerdown={load}
		onfocusin={load}
		class={cn(
			'border-bone text-ink-soft block w-full rounded-xl border bg-white px-3 py-3 text-left text-sm',
			props.class
		)}
	>
		{props.placeholder ?? 'Start writing…'}
	</button>
{/if}
