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

	// Critical, above-the-fold data — awaited so the page paints with real numbers
	// (stat band, credits panel) on first byte.
	const [submissions, earnings, credits, profile] = await Promise.all([
		submissionService.listForFreelancer(caller),
		submissionService.earningsForFreelancer(caller),
		creditService.getBalanceForCaller(caller),
		freelancerService.getMyProfile(caller)
	]);
	const isProfileComplete =
		!!profile.headline?.trim() && !!profile.bio?.trim() && profile.skills.length > 0;

	// Secondary data — returned as unawaited promises so SvelteKit streams it in
	// after first paint. On 3G the page is interactive while these resolve.
	return {
		submissions,
		earnings,
		credits,
		isProfileComplete,
		recommendations: matchingService.recommendBounties(caller, 4),
		notifications: notificationService.listForCaller(caller, { limit: 5 }),
		creditTransactions: creditService.listTransactionsForCaller(caller, { limit: 5 }),
		referrals: referralService.getMyReferralStatus(caller),
		rating: reviewService.getAggregate(caller.id)
	};
};
