<!--
  ProseKit-backed rich-text editor. Stores its content as **HTML** because the
  trust boundary lives in `sanitizeRichText` on the server — keeping the wire
  format as HTML means the same string round-trips between editor → DB → render
  with one sanitise step.

  Toolbar matches plan §13: bold, italic, H2, H3, bullet list, ordered list,
  link, code, blockquote.

  The component is **uncontrolled** for ProseKit state; the parent listens via
  `onChange(html)` and persists. `initialHTML` is only read once on mount.
-->
<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import {
		createEditor,
		defineBaseCommands,
		defineBaseKeymap,
		defineHistory,
		union
	} from '@prosekit/core';
	import { defineDoc } from '@prosekit/extensions/doc';
	import { defineText } from '@prosekit/extensions/text';
	import { defineParagraph } from '@prosekit/extensions/paragraph';
	import { defineHeading } from '@prosekit/extensions/heading';
	import { defineBold } from '@prosekit/extensions/bold';
	import { defineItalic } from '@prosekit/extensions/italic';
	import { defineCode } from '@prosekit/extensions/code';
	import { defineBlockquote } from '@prosekit/extensions/blockquote';
	import { defineList } from '@prosekit/extensions/list';
	import { defineLink } from '@prosekit/extensions/link';
	import { defineHardBreak } from '@prosekit/extensions/hard-break';
	import { definePlaceholder } from '@prosekit/extensions/placeholder';
	import { ProseKit, useDocChange } from '@prosekit/svelte';
	import { cn } from '$lib/utils';

	type Props = {
		initialHTML?: string;
		placeholder?: string;
		onChange?: (html: string) => void;
		class?: string;
		disabled?: boolean;
	};

	let {
		initialHTML = '',
		placeholder = 'Start writing…',
		onChange,
		class: className,
		disabled = false
	}: Props = $props();

	// Placeholder is captured once on mount; changes to the prop after mount
	// don't trigger a re-build (consistent with ProseKit's static extension graph).
	const placeholderText = untrack(() => placeholder);
	const extension = union(
		defineDoc(),
		defineText(),
		defineParagraph(),
		defineHardBreak(),
		defineHistory(),
		defineBold(),
		defineItalic(),
		defineCode(),
		defineHeading(),
		defineBlockquote(),
		defineList(),
		defineLink(),
		definePlaceholder({ placeholder: placeholderText }),
		defineBaseCommands(),
		defineBaseKeymap()
	);

	const editor = createEditor({ extension });

	let initialized = false;
	function mountAction(node: HTMLElement) {
		editor.mount(node);
		if (initialHTML && !initialized) {
			try {
				editor.setContent(initialHTML);
			} catch (e) {
				console.warn('[RichTextEditor] failed to load initial HTML:', e);
			}
			initialized = true;
		}
		return {
			destroy() {
				editor.unmount();
			}
		};
	}

	onDestroy(() => {
		if (editor.mounted) editor.unmount();
	});

	useDocChange(
		() => {
			onChange?.(editor.getDocHTML());
		},
		{ editor }
	);

	function exec(fn: () => void) {
		return (e: Event) => {
			e.preventDefault();
			if (disabled) return;
			fn();
		};
	}

	function promptLink() {
		if (disabled) return;
		const href = window.prompt('Link URL (https:// or mailto:)?');
		if (!href) return;
		if (!/^(https?:|mailto:)/i.test(href)) {
			alert('Only http(s) or mailto links are allowed.');
			return;
		}
		editor.commands.addLink({ href });
	}

	const btn =
		'inline-flex h-8 min-w-8 items-center justify-center rounded px-2 text-xs font-medium ' +
		'text-ink-soft hover:bg-paper hover:text-ink disabled:opacity-50';
</script>

<ProseKit {editor}>
	<div class={cn('border-bone rounded-xl border bg-white', className)}>
		<div class="border-bone flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
			<button
				type="button"
				class={btn}
				{disabled}
				onmousedown={exec(() => editor.commands.toggleBold())}
				title="Bold (⌘B)">B</button
			>
			<button
				type="button"
				class={`${btn} italic`}
				{disabled}
				onmousedown={exec(() => editor.commands.toggleItalic())}
				title="Italic (⌘I)">I</button
			>
			<button
				type="button"
				class={btn}
				{disabled}
				onmousedown={exec(() => editor.commands.toggleCode())}
				title="Inline code">{'</>'}</button
			>
			<span class="bg-bone mx-1 h-5 w-px"></span>
			<button
				type="button"
				class={btn}
				{disabled}
				onmousedown={exec(() => editor.commands.toggleHeading({ level: 2 }))}
				title="Heading 2">H2</button
			>
			<button
				type="button"
				class={btn}
				{disabled}
				onmousedown={exec(() => editor.commands.toggleHeading({ level: 3 }))}
				title="Heading 3">H3</button
			>
			<span class="bg-bone mx-1 h-5 w-px"></span>
			<button
				type="button"
				class={btn}
				{disabled}
				onmousedown={exec(() => editor.commands.toggleList({ kind: 'bullet' }))}
				title="Bullet list">•</button
			>
			<button
				type="button"
				class={btn}
				{disabled}
				onmousedown={exec(() => editor.commands.toggleList({ kind: 'ordered' }))}
				title="Numbered list">1.</button
			>
			<span class="bg-bone mx-1 h-5 w-px"></span>
			<button
				type="button"
				class={btn}
				{disabled}
				onmousedown={exec(() => editor.commands.toggleBlockquote())}
				title="Quote">&gt;</button
			>
			<button type="button" class={btn} {disabled} onmousedown={exec(promptLink)} title="Link"
				>🔗</button
			>
		</div>
		<div
			use:mountAction
			class="prose prose-sm text-ink min-h-[180px] max-w-none px-3 py-2 focus:outline-none"
			class:opacity-50={disabled}
			class:pointer-events-none={disabled}
		></div>
	</div>
</ProseKit>

<style>
	:global(.ProseMirror) {
		min-height: 160px;
	}
	:global(.ProseMirror p.is-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: color-mix(in srgb, var(--color-ink-soft) 55%, transparent);
		pointer-events: none;
		height: 0;
	}
</style>
