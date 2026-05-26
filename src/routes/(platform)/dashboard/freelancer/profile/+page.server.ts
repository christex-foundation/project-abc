import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as freelancerService from '$lib/server/services/freelancer.service';
import * as skillService from '$lib/server/services/skill.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'FREELANCER');
	const [profile, skillCategories] = await Promise.all([
		freelancerService.getMyProfile(caller),
		skillService.listSkills()
	]);
	return { profile, skillCategories };
};
