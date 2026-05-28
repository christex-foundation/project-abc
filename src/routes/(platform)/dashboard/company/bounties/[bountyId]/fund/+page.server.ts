import { error, fail, redirect } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { AppError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import * as escrowService from '$lib/server/services/escrow.service';
import { getAccountInfo } from '$lib/server/services/financial-account.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url, parent }) => {
	await parent();
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

	// Load financial account info so the UI can show balance vs required amount.
	const account = await getAccountInfo(caller).catch(() => ({
		accountId: null,
		uvan: null,
		balance: null
	}));

	return { bounty, cancelled: url.searchParams.has('cancelled'), account };
};

export const actions: Actions = {
	// Redirect to Monime hosted checkout
	fundCheckout: async ({ params, locals }) => {
		const caller = requireAuth(locals);
		let checkoutUrl: string;
		try {
			const result = await escrowService.createFundingCheckoutSession(caller, params.bountyId);
			checkoutUrl = result.url;
		} catch (e) {
			if (e instanceof AppError) return fail(e.httpStatus, { message: e.message });
			console.error('[fund:fundCheckout]', e);
			return fail(500, { message: 'Could not start checkout.' });
		}
		throw redirect(303, checkoutUrl);
	},

	// New: instant internal transfer from company's Monime financial account
	fundInternal: async ({ params, locals }) => {
		const caller = requireAuth(locals);
		try {
			await escrowService.fundFromFinancialAccount(caller, params.bountyId);
		} catch (e) {
			if (e instanceof AppError) return fail(e.httpStatus, { message: e.message });
			console.error('[fund:fundInternal]', e);
			return fail(500, { message: 'Transfer failed. Please try again.' });
		}
		throw redirect(303, `/dashboard/company/bounties?funded=${params.bountyId}`);
	}
};
