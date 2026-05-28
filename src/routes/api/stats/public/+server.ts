import { json } from '@sveltejs/kit';
import * as statsService from '$lib/server/services/stats.service';
import { respondError } from '$lib/server/http';
import type { RequestHandler } from './$types';

/**
 * Public stats endpoint. No auth — feeds the home hero, marketing site, and
 * the recent-earners ticker. 60s cache (stale-while-revalidate up to 5m) is
 * enough freshness for social-proof numbers and keeps the DB query cost low.
 */
export const GET: RequestHandler = async () => {
	try {
		const stats = await statsService.getPublicStats({ winnersLimit: 20 });
		return json(stats, {
			headers: {
				'cache-control': 'public, max-age=60, stale-while-revalidate=300'
			}
		});
	} catch (e) {
		return respondError(e);
	}
};
