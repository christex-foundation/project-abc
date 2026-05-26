import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as submissionService from '$lib/server/services/submission.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'FREELANCER');
	const earnings = await submissionService.earningsForFreelancer(caller);
	return { earnings };
};
