import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as matchingService from '$lib/server/services/matching.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		const caller = requireAuth(locals);
		const limitRaw = url.searchParams.get('limit');
		const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 50, 1), 100) : 50;
		const recommendations = await matchingService.recommendBounties(caller, limit);
		return json({ recommendations });
	} catch (e) {
		return respondError(e);
	}
};
