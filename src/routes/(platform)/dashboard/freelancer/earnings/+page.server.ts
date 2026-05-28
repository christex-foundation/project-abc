import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as submissionService from '$lib/server/services/submission.service';
import {
	getAccountInfo,
	getWithdrawalDestination
} from '$lib/server/services/financial-account.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'FREELANCER');

	const [earnings, account, destination] = await Promise.all([
		submissionService.earningsForFreelancer(caller),
		getAccountInfo(caller).catch(() => ({ accountId: null, uvan: null, balance: null })),
		getWithdrawalDestination(caller).catch(() => null)
	]);

	return { earnings, account, destination };
};
