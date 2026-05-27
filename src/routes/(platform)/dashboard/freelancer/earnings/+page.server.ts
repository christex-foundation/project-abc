import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as submissionService from '$lib/server/services/submission.service';
import { getAccountInfo } from '$lib/server/services/financial-account.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'FREELANCER');

	const [earnings, account] = await Promise.all([
		submissionService.earningsForFreelancer(caller),
		getAccountInfo(caller).catch(() => ({ accountId: null, uvan: null, balance: null }))
	]);

	return { earnings, account };
};
