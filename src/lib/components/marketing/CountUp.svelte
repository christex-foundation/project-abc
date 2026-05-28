<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		value: number;
		duration?: number;
		formatter?: (n: number) => string;
	};

	let { value, duration = 900, formatter }: Props = $props();

	let display = $state(0);
	let rootEl: HTMLSpanElement | null = $state(null);

	function reducedMotion(): boolean {
		if (typeof window === 'undefined') return false;
		return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
	}

	function easeOutQuad(t: number) {
		return 1 - (1 - t) * (1 - t);
	}

	function run() {
		if (reducedMotion()) {
			display = value;
			return;
		}
		const start = performance.now();
		const from = 0;
		const to = value;
		function tick(now: number) {
			const t = Math.min(1, (now - start) / duration);
			display = Math.round(from + (to - from) * easeOutQuad(t));
			if (t < 1) requestAnimationFrame(tick);
			else display = to;
		}
		requestAnimationFrame(tick);
	}

	onMount(() => {
		if (!rootEl) {
			run();
			return;
		}
		if (!('IntersectionObserver' in window)) {
			run();
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					run();
					io.disconnect();
				}
			},
			{ threshold: 0.25 }
		);
		io.observe(rootEl);
		return () => io.disconnect();
	});

	const out = $derived(formatter ? formatter(display) : display.toLocaleString());
</script>

<span bind:this={rootEl} class="tabular-nums">{out}</span>
