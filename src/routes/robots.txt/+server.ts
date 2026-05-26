import { isAdminHost } from '$lib/server/host';
import type { RequestHandler } from './$types';

const SITEMAP_PATH = '/sitemap.xml';

export const GET: RequestHandler = async ({ url }) => {
	if (isAdminHost(url)) {
		return new Response('User-agent: *\nDisallow: /\n', {
			headers: { 'content-type': 'text/plain' }
		});
	}

	const origin = process.env.PUBLIC_APP_URL ?? `${url.protocol}//${url.host}`;
	const body = [
		'User-agent: *',
		'Disallow: /admin',
		'Disallow: /dashboard',
		'Disallow: /api',
		'Disallow: /accept-invite',
		'Disallow: /verify-email',
		'Disallow: /forgot-password',
		'Disallow: /settings',
		'Disallow: /profile',
		'Disallow: /notifications',
		'',
		`Sitemap: ${origin}${SITEMAP_PATH}`,
		''
	].join('\n');

	return new Response(body, { headers: { 'content-type': 'text/plain' } });
};
