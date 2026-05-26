import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as skillService from '$lib/server/services/skill.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'ADMIN');
	const categories = await skillService.listSkills();
	return { categories };
};
