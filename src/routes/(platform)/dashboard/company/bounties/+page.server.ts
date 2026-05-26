import * as bountyService from '$lib/server/services/bounty.service';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'COMPANY', 'ADMIN');
	const bounties = await bountyService.listForCompany(caller);
	return { bounties };
};
