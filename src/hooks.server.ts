import { error, redirect, type Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '$lib/server/auth';
import { adminHostFor, isAdminHost, isAdminHostAllowedPath } from '$lib/server/host';
import { getAllSettings } from '$lib/server/settings';
import type { UserRole } from '@prisma/client';

export const handle: Handle = async ({ event, resolve }) => {
	const { url } = event;
	const onAdminHost = isAdminHost(url);
	event.locals.isAdminHost = onAdminHost;

	// 1. Host-split routing — applied to every non-/api/auth request.
	if (!url.pathname.startsWith('/api/auth')) {
		if (onAdminHost) {
			// Root on admin host bounces to /admin.
			if (url.pathname === '/') {
				throw redirect(302, '/admin');
			}
			if (!isAdminHostAllowedPath(url.pathname)) {
				throw error(404, 'Not found');
			}
		} else {
			// Main host: admin pages and admin APIs live on the admin host.
			if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')) {
				const target = new URL(url);
				target.host = adminHostFor(url);
				throw redirect(302, target.toString());
			}
		}
	}

	// 2. Resolve the Better Auth session.
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session?.user) {
		const u = session.user as typeof session.user & {
			role?: UserRole;
			isActive?: boolean;
		};
		event.locals.user = {
			id: u.id,
			email: u.email,
			name: u.name ?? null,
			role: (u.role as UserRole) ?? 'FREELANCER',
			isActive: u.isActive ?? true,
			emailVerified: u.emailVerified ?? false
		};
		event.locals.session = { id: session.session.id, expiresAt: session.session.expiresAt };
	} else {
		event.locals.user = null;
		event.locals.session = null;
	}

	// 3. Load platform settings (cached).
	event.locals.settings = await getAllSettings();

	// 4. Delegate to Better Auth for /api/auth/*, otherwise normal resolve.
	const response = await svelteKitHandler({ event, resolve, auth, building });

	// 5. Security headers — applied to every response.
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set(
		'Permissions-Policy',
		'geolocation=(), microphone=(), camera=(), payment=()'
	);
	if (url.protocol === 'https:') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	return response;
};
