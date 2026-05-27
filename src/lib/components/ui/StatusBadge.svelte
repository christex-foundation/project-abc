<script lang="ts">
	import { cn } from '$lib/utils';
	import { toneFor, TONE_CLASSES, type StatusTone } from './status-tone';

	type Props = {
		value: string;
		tone?: StatusTone;
		class?: string;
		label?: string;
	};

	let { value, tone, class: className, label }: Props = $props();
	const resolvedTone = $derived(tone ?? toneFor(value));
	const display = $derived(label ?? value.replaceAll('_', ' ').toLowerCase());
</script>

<span
	class={cn(
		'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset',
		TONE_CLASSES[resolvedTone],
		className
	)}
>
	{display}
</span>
