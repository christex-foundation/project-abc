import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as submissionService from '$lib/server/services/submission.service';
import * as matchingService from '$lib/server/services/matching.service';
import * as notificationService from '$lib/server/services/notification.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'FREELANCER');
	const [submissions, earnings, recommendations, notifications] = await Promise.all([
		submissionService.listForFreelancer(caller),
		submissionService.earningsForFreelancer(caller),
		matchingService.recommendBounties(caller, 4),
		notificationService.listForCaller(caller, { limit: 5 })
	]);
	return { submissions, earnings, recommendations, notifications };
};
