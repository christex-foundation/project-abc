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
			class="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
			aria-label="Close modal"
			onclick={onClose}
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'modal-title' : undefined}
			class={cn(
				'relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl',
				sizeClass
			)}
		>
			{#if title || description}
				<header class="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
					<div class="min-w-0">
						{#if title}
							<h2 id="modal-title" class="text-base font-semibold text-zinc-900">{title}</h2>
						{/if}
						{#if description}
							<p class="mt-0.5 text-xs text-zinc-500">{description}</p>
						{/if}
					</div>
					<button
						type="button"
						class="-m-2 rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
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
				<footer class="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50/60 px-5 py-3">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
