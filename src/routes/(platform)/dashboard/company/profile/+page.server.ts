import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as companyService from '$lib/server/services/company.service';
import { resolveAvatar } from '$lib/server/avatar';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'COMPANY');
	const profile = await companyService.getMyProfile(caller);
	// Uploaded logo, or a DiceBear placeholder seeded from the company name.
	const logoAvatar = resolveAvatar(profile.logo, profile.companyName);
	return { profile, logoAvatar };
};
