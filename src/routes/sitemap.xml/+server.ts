import * as sitemap from 'super-sitemap';
import { isAdminHost } from '$lib/server/host';
import { listActiveBountySlugs } from '$lib/server/repositories/bounty.repo';
import type { RequestHandler } from './$types';

const ORIGIN = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';

export const GET: RequestHandler = async ({ url }) => {
	if (isAdminHost(url)) {
		// Admin host never gets indexed — its robots.txt already blocks crawlers.
		return new Response('Not found', { status: 404 });
	}

	const slugs = await listActiveBountySlugs();

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
			'^/notifications',
			// Wizard / authed-only bounty subroutes.
			'^/bounties/create',
			'^/bounties/[^/]+/(submit|submissions)'
		],
		paramValues: {
			'/bounties/[slug]': slugs
		},
		defaultChangefreq: 'daily',
		defaultPriority: 0.7
	});
};
