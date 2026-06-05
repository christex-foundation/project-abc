import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as submissionService from '$lib/server/services/submission.service';
import * as proposalService from '$lib/server/services/proposal.service';
import * as projectService from '$lib/server/services/project.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'FREELANCER');
	const [submissions, proposals, contractedProjects] = await Promise.all([
		submissionService.listForFreelancer(caller),
		proposalService.listForFreelancer(caller),
		projectService.listForContractor(caller)
	]);
	return { submissions, proposals, contractedProjects };
};
