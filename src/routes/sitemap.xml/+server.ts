import * as sitemap from 'super-sitemap';
import { isAdminHost } from '$lib/server/host';
import type { RequestHandler } from './$types';

const ORIGIN = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';

export const GET: RequestHandler = async ({ url }) => {
	if (isAdminHost(url)) {
		// Admin host never gets indexed — its robots.txt already blocks crawlers.
		return new Response('Not found', { status: 404 });
	}

	return sitemap.response({
		origin: ORIGIN,
		excludeRoutePatterns: [
			'^/admin.*',
			'^/dashboard.*',
			'^/api.*',
			'^/\\(auth\\)/.*',
			'^/accept-invite',
			'^/verify-email',
			'^/forgot-password',
			'^/settings.*',
			'^/profile',
			'^/notifications'
		],
		// `paramValues['/bounties/[slug]']` lands in Phase 2 once the bounty
		// detail route exists. super-sitemap throws if you reference a route
		// that hasn't been created yet.
		defaultChangefreq: 'daily',
		defaultPriority: 0.7
	});
};
