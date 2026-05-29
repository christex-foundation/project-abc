/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Prerendered static shell shown when a navigation can reach neither the
// network nor the cache. Precached via the plugin's `prerendered/**` glob
// (see src/routes/offline).
const OFFLINE_URL = '/offline';

precacheAndRoute(self.__WB_MANIFEST);

// App-shell navigations: try network briefly, fall back to cache so the PWA
// opens instantly when offline. 3s timeout matches plan §9.
registerRoute(
	new NavigationRoute(
		new NetworkFirst({
			cacheName: 'fow-shell',
			networkTimeoutSeconds: 3
		})
	)
);

// Static immutable assets — hashed by SvelteKit so safe to cache for a year.
registerRoute(
	({ url }) =>
		url.pathname.startsWith('/_app/immutable') ||
		url.pathname.startsWith('/icons') ||
		/\.(?:woff2?|png|svg|webp|ico)$/.test(url.pathname),
	new CacheFirst({
		cacheName: 'fow-static',
		plugins: [
			new ExpirationPlugin({
				maxEntries: 200,
				maxAgeSeconds: 60 * 60 * 24 * 365
			})
		]
	})
);

// /api/* deliberately has no route registered → Workbox falls through to
// NetworkOnly. Auth and freshness make caching unsafe (plan §9).

// Last resort for navigations that fail both network and cache (e.g. a page
// the user has never opened while fully offline): serve the precached offline
// shell instead of the browser's default error page.
setCatchHandler(async ({ request }) => {
	if (request.mode === 'navigate') {
		const cached = await matchPrecache(OFFLINE_URL);
		if (cached) return cached;
	}
	return Response.error();
});

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', (event) => {
	let data: { title?: string; body?: string; url?: string; tag?: string } = {};
	try {
		data = event.data?.json() ?? {};
	} catch {
		data = { title: 'FOW', body: event.data?.text() };
	}
	const title = data.title ?? 'FOW';
	const opts: NotificationOptions = {
		body: data.body ?? '',
		icon: '/icons/icon-192.png',
		badge: '/icons/icon-192.png',
		tag: data.tag,
		// renotify replaces an existing notification with the same tag without
		// suppressing the OS alert — useful when the same event fires twice
		// (e.g. payout completed for two tranches in quick succession).
		renotify: !!data.tag,
		data: { url: data.url ?? '/' }
	};
	event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const targetUrl = (event.notification.data?.url as string | undefined) ?? '/';
	event.waitUntil(
		(async () => {
			const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			for (const client of all) {
				try {
					if ('focus' in client) await client.focus();
					if ('navigate' in client) await client.navigate(targetUrl);
					return;
				} catch {
					// fall through to openWindow
				}
			}
			await self.clients.openWindow(targetUrl);
		})()
	);
});
