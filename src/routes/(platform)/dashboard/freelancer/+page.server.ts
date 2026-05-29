import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as submissionService from '$lib/server/services/submission.service';
import * as matchingService from '$lib/server/services/matching.service';
import * as notificationService from '$lib/server/services/notification.service';
import * as creditService from '$lib/server/services/credit.service';
import * as referralService from '$lib/server/services/referral.service';
import * as freelancerService from '$lib/server/services/freelancer.service';
import * as reviewService from '$lib/server/services/review.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'FREELANCER');
	const [
		submissions,
		earnings,
		recommendations,
		notifications,
		credits,
		creditTransactions,
		referrals,
		profile
	] = await Promise.all([
		submissionService.listForFreelancer(caller),
		submissionService.earningsForFreelancer(caller),
		matchingService.recommendBounties(caller, 4),
		notificationService.listForCaller(caller, { limit: 5 }),
		creditService.getBalanceForCaller(caller),
		creditService.listTransactionsForCaller(caller, { limit: 5 }),
		referralService.getMyReferralStatus(caller),
		freelancerService.getMyProfile(caller)
	]);
	const rating = await reviewService.getAggregate(caller.id);
	const isProfileComplete =
		!!profile.headline?.trim() && !!profile.bio?.trim() && profile.skills.length > 0;
	return {
		submissions,
		earnings,
		recommendations,
		notifications,
		credits,
		creditTransactions,
		referrals,
		rating,
		isProfileComplete
	};
};
