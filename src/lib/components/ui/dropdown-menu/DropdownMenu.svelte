<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Align = 'start' | 'end';

	type Props = {
		open: boolean;
		onOpenChange: (value: boolean) => void;
		trigger: Snippet<[{ open: boolean }]>;
		children: Snippet;
		align?: Align;
		class?: string;
		ariaLabel?: string;
	};

	let {
		open = $bindable(),
		onOpenChange,
		trigger,
		children,
		align = 'end',
		class: className,
		ariaLabel
	}: Props = $props();

	let rootEl: HTMLDivElement | null = $state(null);

	function close() {
		if (open) onOpenChange(false);
	}

	function toggle() {
		onOpenChange(!open);
	}

	function handleWindowClick(e: MouseEvent) {
		if (!open) return;
		if (!rootEl) return;
		if (e.target instanceof Node && rootEl.contains(e.target)) return;
		close();
	}

	function handleKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleKey} />

<div bind:this={rootEl} class="relative inline-block">
	<button
		type="button"
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label={ariaLabel}
		onclick={toggle}
		class="cursor-pointer"
	>
		{@render trigger({ open })}
	</button>

	{#if open}
		<div
			role="menu"
			class={cn(
				'fow-dropdown absolute z-40 mt-2 min-w-[14rem] max-w-[calc(100vw-1.5rem)] origin-top rounded-xl border border-bone bg-cream p-1.5 shadow-[0_18px_40px_-22px_rgba(26,26,26,0.45)]',
				align === 'end' ? 'right-0' : 'left-0',
				className
			)}
		>
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.fow-dropdown {
		animation: fow-dropdown-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes fow-dropdown-in {
		from {
			opacity: 0;
			transform: scale(0.96) translateY(-4px);
		}
		60% {
			transform: scale(1.01) translateY(0);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fow-dropdown {
			animation: none;
		}
	}
</style>
