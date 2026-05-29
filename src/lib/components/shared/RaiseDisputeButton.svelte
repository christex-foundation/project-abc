<script lang="ts">
	let {
		bountyId,
		projectId,
		bountyTitle,
		title,
		submissionId,
		label = 'Raise dispute',
		variant = 'outline'
	}: {
		bountyId?: string;
		projectId?: string;
		bountyTitle?: string;
		title?: string;
		submissionId?: string;
		label?: string;
		variant?: 'outline' | 'ghost';
	} = $props();

	const subjectTitle = $derived(bountyTitle ?? title);

	let open = $state(false);
	let reason = $state('');
	let submitting = $state(false);
	let errorMsg = $state<string | null>(null);
	let okMsg = $state<string | null>(null);

	function close() {
		open = false;
		errorMsg = null;
	}

	async function submit() {
		errorMsg = null;
		const trimmed = reason.trim();
		if (trimmed.length < 10) {
			errorMsg = 'Please describe the issue (at least 10 characters).';
			return;
		}
		submitting = true;
		try {
			const res = await fetch('/api/disputes', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ bountyId, projectId, submissionId, reason: trimmed })
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				errorMsg = j?.error?.message ?? `Failed (${res.status})`;
				return;
			}
			okMsg = 'Dispute raised. An admin will review shortly.';
			reason = '';
			setTimeout(() => {
				open = false;
				okMsg = null;
			}, 1500);
		} finally {
			submitting = false;
		}
	}
</script>

<button
	type="button"
	onclick={() => (open = true)}
	class={`rounded px-2 py-1 text-xs ${
		variant === 'outline' ? 'border border-zinc-300 hover:bg-zinc-50' : 'hover:bg-zinc-50'
	}`}
>
	{label}
</button>

{#if open}
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="raise-dispute-title"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
	>
		<button type="button" aria-label="Close" onclick={close} class="absolute inset-0 cursor-default"
		></button>
		<div class="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
			<h2 id="raise-dispute-title" class="text-base font-semibold">Raise a dispute</h2>
			{#if subjectTitle}
				<p class="mt-1 text-sm text-zinc-500">On "{subjectTitle}"</p>
			{/if}
			<p class="mt-3 text-xs text-zinc-500">
				Tell us what went wrong. An admin will reach out after reviewing.
			</p>
			<textarea
				bind:value={reason}
				rows={5}
				maxlength={2000}
				placeholder="Describe the issue in detail."
				class="mt-3 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
			></textarea>
			{#if errorMsg}<p class="mt-2 text-sm text-red-600">{errorMsg}</p>{/if}
			{#if okMsg}<p class="mt-2 text-sm text-green-700">{okMsg}</p>{/if}
			<div class="mt-4 flex justify-end gap-2">
				<button
					type="button"
					onclick={close}
					class="rounded border border-zinc-300 px-3 py-1.5 text-sm"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={submit}
					disabled={submitting}
					class="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
				>
					{submitting ? 'Submitting…' : 'Submit'}
				</button>
			</div>
		</div>
	</div>
{/if}
