import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as freelancerService from '$lib/server/services/freelancer.service';
import * as skillService from '$lib/server/services/skill.service';
import * as proofOfWorkService from '$lib/server/services/proofOfWork.service';
import { resolveAvatar } from '$lib/server/avatar';
import { ensureHandle } from '$lib/server/handle';
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
	// Backfill a public handle for accounts created before handles existed, so the
	// shareable link below is always populated.
	const handle = await ensureHandle(caller.id, profile.displayName);
	return {
		profile,
		skillCategories,
		proofOfWork,
		handle,
		avatar: resolveAvatar(caller.image, profile.displayName)
	};
};
