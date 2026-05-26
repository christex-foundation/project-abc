import { env } from '$env/dynamic/public';

/**
 * Browser-only push helpers. Every entry point is SSR-safe — calling any of
 * them during prerender or on the server returns a neutral value rather than
 * crashing.
 */

export type PermissionState = NotificationPermission | 'unsupported';

function isSupported(): boolean {
	return (
		typeof window !== 'undefined' &&
		typeof navigator !== 'undefined' &&
		'serviceWorker' in navigator &&
		'PushManager' in window
	);
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
	const padding = '='.repeat((4 - (base64.length % 4)) % 4);
	const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(normalized);
	const arr = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
	return arr;
}

export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
	if (!isSupported()) return null;
	return navigator.serviceWorker.ready;
}

export function currentPermission(): PermissionState {
	if (!isSupported() || typeof Notification === 'undefined') return 'unsupported';
	return Notification.permission;
}

export async function requestPermission(): Promise<PermissionState> {
	if (!isSupported() || typeof Notification === 'undefined') return 'unsupported';
	return Notification.requestPermission();
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
	const reg = await getRegistration();
	if (!reg) return null;
	return reg.pushManager.getSubscription();
}

/**
 * Subscribe this device. Idempotent — re-uses the existing subscription if one
 * is already attached. Returns null when push is unsupported, the public VAPID
 * key is missing, or the server rejected the registration (in which case the
 * just-created browser subscription is rolled back so the next attempt is
 * clean).
 */
export async function subscribe(): Promise<PushSubscription | null> {
	const reg = await getRegistration();
	if (!reg) return null;
	const key = env.PUBLIC_VAPID_KEY;
	if (!key) {
		console.warn('[push] PUBLIC_VAPID_KEY missing — cannot subscribe.');
		return null;
	}

	const existing = await reg.pushManager.getSubscription();
	if (existing) {
		// Re-sync with the server in case the row was pruned.
		await postSubscribe(existing).catch(() => {});
		return existing;
	}

	const sub = await reg.pushManager.subscribe({
		userVisibleOnly: true,
		// TS 6 narrows Uint8Array's buffer to ArrayBufferLike (potentially SAB).
		// PushSubscriptionOptionsInit only accepts ArrayBuffer-backed views, so
		// cast to BufferSource — runtime payload is bytes either way.
		applicationServerKey: urlBase64ToUint8Array(key) as unknown as BufferSource
	});

	const ok = await postSubscribe(sub);
	if (!ok) {
		await sub.unsubscribe().catch(() => {});
		return null;
	}
	return sub;
}

export async function unsubscribe(): Promise<void> {
	const reg = await getRegistration();
	if (!reg) return;
	const sub = await reg.pushManager.getSubscription();
	if (!sub) return;
	const endpoint = sub.endpoint;
	await sub.unsubscribe().catch(() => {});
	await fetch('/api/push/unsubscribe', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ endpoint })
	}).catch(() => {});
}

async function postSubscribe(sub: PushSubscription): Promise<boolean> {
	const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
	if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
	const res = await fetch('/api/push/subscribe', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			endpoint: json.endpoint,
			keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
			userAgent: navigator.userAgent
		})
	}).catch(() => null);
	return !!res && res.ok;
}
