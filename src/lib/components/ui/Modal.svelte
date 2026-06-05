<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import X from '@lucide/svelte/icons/x';

	type Props = {
		open: boolean;
		onClose: () => void;
		title?: string;
		description?: string;
		size?: 'sm' | 'md' | 'lg';
		children: Snippet;
		footer?: Snippet;
	};

	let {
		open = $bindable(),
		onClose,
		title,
		description,
		size = 'md',
		children,
		footer
	}: Props = $props();

	const sizeClass = $derived(
		size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md'
	);

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={open ? handleKey : undefined} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="bg-ink/40 absolute inset-0 backdrop-blur-sm"
			aria-label="Close modal"
			onclick={onClose}
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'modal-title' : undefined}
			class={cn(
				'border-bone relative w-full overflow-hidden rounded-[var(--radius-card)] border bg-cream shadow-[var(--shadow-card-lift)]',
				sizeClass
			)}
		>
			{#if title || description}
				<header class="border-bone flex items-start justify-between gap-4 border-b px-5 py-4">
					<div class="min-w-0">
						{#if title}
							<h2 id="modal-title" class="text-ink text-base font-semibold">{title}</h2>
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
			{/if}
			<div class="px-5 py-4">
				{@render children()}
			</div>
			{#if footer}
				<footer class="border-bone bg-paper/50 flex justify-end gap-2 border-t px-5 py-3">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
