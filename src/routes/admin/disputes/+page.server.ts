import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as disputeService from '$lib/server/services/dispute.service';
import { DISPUTE_STATUSES, type DisputeStatus } from '$lib/validators/dispute';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'ADMIN');
	const statusParam = url.searchParams.get('status');
	const status: DisputeStatus | undefined =
		statusParam && DISPUTE_STATUSES.includes(statusParam as DisputeStatus)
			? (statusParam as DisputeStatus)
			: undefined;
	const disputes = await disputeService.listForAdmin(caller, { status });
	return { disputes, status: status ?? '' };
};
