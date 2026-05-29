import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as freelancerService from '$lib/server/services/freelancer.service';
import * as skillService from '$lib/server/services/skill.service';
import * as proofOfWorkService from '$lib/server/services/proofOfWork.service';
import { avatarDataUri } from '$lib/server/avatar';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'FREELANCER');
	const [profile, skillCategories, proofOfWork] = await Promise.all([
		freelancerService.getMyProfile(caller),
		skillService.listSkills(),
		proofOfWorkService.list(caller)
	]);
	return { profile, skillCategories, proofOfWork, avatar: avatarDataUri(profile.displayName) };
};
