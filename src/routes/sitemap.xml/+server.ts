import * as sitemap from 'super-sitemap';
import { isAdminHost } from '$lib/server/host';
import { listActiveBountySlugs } from '$lib/server/repositories/bounty.repo';
import { listActiveProjectSlugs } from '$lib/server/repositories/project.repo';
import { listPublicHandles } from '$lib/server/repositories/user.repo';
import type { RequestHandler } from './$types';

const ORIGIN = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';

export const GET: RequestHandler = async ({ url }) => {
	if (isAdminHost(url)) {
		// Admin host never gets indexed — its robots.txt already blocks crawlers.
		return new Response('Not found', { status: 404 });
	}

	const [bountySlugs, projectSlugs, handles] = await Promise.all([
		listActiveBountySlugs(),
		listActiveProjectSlugs(),
		listPublicHandles()
	]);

	return sitemap.response({
		origin: ORIGIN,
		// NOTE: super-sitemap matches these patterns against route ids that still
		// include the `/(group)` prefix (it strips groups only afterwards), so
		// authed routes must be excluded by their group, not their stripped path.
		excludeRoutePatterns: [
			'^/admin.*',
			'^/api.*',
			// All authed app routes: dashboard, settings, notifications, profile editors.
			'^/\\(platform\\)/.*',
			// All auth pages: login, register, verify-email, reset/forgot, accept-invite.
			'^/\\(auth\\)/.*',
			'^/goodbye',
			'^/offline',
			// Public dynamic pages that are actions, not indexable content.
			'^/bounties/[^/]+/submit',
			'^/projects/[^/]+/(apply|workspace)'
		],
		paramValues: {
			'/bounties/[slug]': bountySlugs,
			'/projects/[slug]': projectSlugs,
			'/u/[handle]': handles
		},
		defaultChangefreq: 'daily',
		defaultPriority: 0.7
	});
};
