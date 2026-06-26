<script lang="ts">
	import { apiFetch } from '$lib/client/net';
	import { Button } from '$lib/components/ui';
	import UserAvatar from './UserAvatar.svelte';

	type Props = {
		/** Current image to display (uploaded URL or DiceBear fallback data-URI). */
		current: string;
		/** Which signed-upload bucket to use. */
		purpose: 'avatar' | 'logo';
		alt?: string;
		size?: number;
		/** Called with the new Cloudinary secure_url once upload succeeds. */
		onUploaded: (url: string) => void | Promise<void>;
		label?: string;
	};
	let {
		current,
		purpose,
		alt = '',
		size = 96,
		onUploaded,
		label = 'Change photo'
	}: Props = $props();

	const MAX_BYTES = 5 * 1024 * 1024; // 5MB — plan §15.

	let fileInput = $state<HTMLInputElement>();
	let uploading = $state(false);
	let error = $state<string | null>(null);

	function pick() {
		error = null;
		fileInput?.click();
	}

	async function onFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		// Reset so picking the same file again re-fires the change event.
		input.value = '';
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			error = 'Please choose an image file.';
			return;
		}
		if (file.size > MAX_BYTES) {
			error = 'Image must be 5MB or smaller.';
			return;
		}

		uploading = true;
		error = null;
		try {
			// 1. Get a short-lived signature from our server.
			const signRes = await apiFetch('/api/uploads/sign', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ purpose })
			});
			if (!signRes.ok) {
				const body = await signRes.json().catch(() => ({}));
				error = body?.error?.message ?? 'Could not start the upload.';
				return;
			}
			const sig = await signRes.json();

			// 2. Upload the file straight to Cloudinary. The signed params must match
			//    exactly what the server signed.
			const form = new FormData();
			form.append('file', file);
			form.append('api_key', sig.apiKey);
			form.append('timestamp', String(sig.timestamp));
			form.append('signature', sig.signature);
			form.append('folder', sig.folder);
			form.append('public_id', sig.publicId);
			form.append('overwrite', String(sig.overwrite));
			form.append('invalidate', String(sig.invalidate));

			const uploadRes = await apiFetch(
				`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
				{ method: 'POST', body: form },
				{ timeoutMs: 60000 }
			);
			if (!uploadRes.ok) {
				error = 'Upload failed. Please try again.';
				return;
			}
			const uploaded = await uploadRes.json();
			const url: string | undefined = uploaded.secure_url;
			if (!url) {
				error = 'Upload failed. Please try again.';
				return;
			}

			// 3. Hand the persisted URL back to the parent.
			current = url;
			await onUploaded(url);
		} catch {
			// apiFetch already toasts network failures.
			error = 'Upload failed. Check your connection and try again.';
		} finally {
			uploading = false;
		}
	}
</script>

<div class="flex items-center gap-4">
	<UserAvatar src={current} {alt} {size} class="border-bone border" />
	<div class="space-y-1">
		<Button type="button" variant="outline" onclick={pick} disabled={uploading}>
			{uploading ? 'Uploading…' : label}
		</Button>
		<p class="text-ink-soft text-xs">JPG or PNG, up to 5MB.</p>
		{#if error}
			<p class="text-xs text-red-600">{error}</p>
		{/if}
	</div>
	<input bind:this={fileInput} type="file" accept="image/*" class="hidden" onchange={onFile} />
</div>
