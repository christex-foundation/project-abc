import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as companyService from '$lib/server/services/company.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'COMPANY');
	const profile = await companyService.getMyProfile(caller);
	return { profile };
};
