import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as submissionService from '$lib/server/services/submission.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'FREELANCER');
	const [submissions, earnings] = await Promise.all([
		submissionService.listForFreelancer(caller),
		submissionService.earningsForFreelancer(caller)
	]);
	return { submissions, earnings };
};
