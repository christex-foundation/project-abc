<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import X from '@lucide/svelte/icons/x';

	type Props = {
		open: boolean;
		onClose: () => void;
		title?: string;
		description?: string;
		width?: 'sm' | 'md' | 'lg';
		children: Snippet;
		footer?: Snippet;
	};

	let {
		open = $bindable(),
		onClose,
		title,
		description,
		width = 'md',
		children,
		footer
	}: Props = $props();

	const widthClass = $derived(
		width === 'sm' ? 'max-w-md' : width === 'lg' ? 'max-w-3xl' : 'max-w-xl'
	);

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={open ? handleKey : undefined} />

{#if open}
	<div class="fixed inset-0 z-50">
		<button
			type="button"
			class="bg-ink/40 absolute inset-0 backdrop-blur-sm"
			aria-label="Close drawer"
			onclick={onClose}
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'drawer-title' : undefined}
			class={cn(
				'bg-cream absolute inset-y-0 right-0 flex w-full flex-col shadow-[var(--shadow-card-lift)]',
				'animate-in slide-in-from-right duration-200',
				widthClass
			)}
		>
			<header class="border-bone flex items-start justify-between gap-4 border-b px-5 py-4">
				<div class="min-w-0">
					{#if title}
						<h2 id="drawer-title" class="text-ink truncate text-base font-semibold">
							{title}
						</h2>
					{/if}
					{#if description}
						<p class="text-ink-soft mt-0.5 text-xs">{description}</p>
					{/if}
				</div>
				<button
					type="button"
					class="text-ink-soft hover:bg-paper hover:text-ink -m-2 rounded-md p-2 transition-colors"
					onclick={onClose}
					aria-label="Close"
				>
					<X class="h-4 w-4" />
				</button>
			</header>
			<div class="flex-1 overflow-y-auto px-5 py-4">
				{@render children()}
			</div>
			{#if footer}
				<footer class="border-bone bg-paper/50 border-t px-5 py-3">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
