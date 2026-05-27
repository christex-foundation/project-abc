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
			class="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
			aria-label="Close drawer"
			onclick={onClose}
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'drawer-title' : undefined}
			class={cn(
				'absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl',
				'animate-in slide-in-from-right duration-200',
				widthClass
			)}
		>
			<header class="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
				<div class="min-w-0">
					{#if title}
						<h2 id="drawer-title" class="truncate text-base font-semibold text-zinc-900">
							{title}
						</h2>
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
			<div class="flex-1 overflow-y-auto px-5 py-4">
				{@render children()}
			</div>
			{#if footer}
				<footer class="border-t border-zinc-200 bg-zinc-50/60 px-5 py-3">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
