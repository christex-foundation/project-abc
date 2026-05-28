import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as bountyService from '$lib/server/services/bounty.service';
import * as notificationService from '$lib/server/services/notification.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'COMPANY', 'ADMIN');
	const [stats, bounties, notifications] = await Promise.all([
		bountyService.companyOverviewStats(caller),
		bountyService.listForCompany(caller),
		notificationService.listForCaller(caller, { limit: 5 })
	]);
	return { stats, bounties, notifications };
};
