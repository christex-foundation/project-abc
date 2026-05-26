import { error, fail, redirect } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { AppError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import * as escrowService from '$lib/server/services/escrow.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'COMPANY', 'ADMIN');

	let bounty;
	try {
		bounty = await bountyService.getBounty(caller, params.bountyId);
	} catch (e) {
		if (e instanceof AppError) throw error(e.httpStatus, e.message);
		throw e;
	}
	if (bounty.status !== 'DRAFT') {
		throw redirect(303, '/dashboard/company/bounties');
	}
	return { bounty, cancelled: url.searchParams.has('cancelled') };
};

export const actions: Actions = {
	default: async ({ params, locals }) => {
		const caller = requireAuth(locals);
		let checkoutUrl: string;
		try {
			const result = await escrowService.createFundingCheckoutSession(caller, params.bountyId);
			checkoutUrl = result.url;
		} catch (e) {
			if (e instanceof AppError) return fail(e.httpStatus, { message: e.message });
			console.error('[fund:default]', e);
			return fail(500, { message: 'Could not start checkout.' });
		}
		throw redirect(303, checkoutUrl);
	}
};
