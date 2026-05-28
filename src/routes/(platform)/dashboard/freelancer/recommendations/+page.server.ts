import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as matchingService from '$lib/server/services/matching.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'FREELANCER');
	const recommendations = await matchingService.recommendBounties(caller, 50);
	return { recommendations };
};
