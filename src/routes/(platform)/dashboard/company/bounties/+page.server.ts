import { fail } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { AppError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import * as escrowService from '$lib/server/services/escrow.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'COMPANY', 'ADMIN');
	const bounties = await bountyService.listForCompany(caller);
	return { bounties };
};

function failureFor(action: 'publish' | 'cancel', bountyId: string, e: unknown) {
	if (e instanceof AppError) {
		return fail(e.httpStatus, { action, bountyId, message: e.message });
	}
	console.error(`[dashboard:${action}]`, e);
	return fail(500, { action, bountyId, message: 'Something went wrong.' });
}

export const actions: Actions = {
	publish: async ({ request, locals }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const bountyId = String(form.get('bountyId') ?? '');
		try {
			await bountyService.publish(caller, bountyId);
			return { action: 'publish', bountyId, success: true };
		} catch (e) {
			return failureFor('publish', bountyId, e);
		}
	},
	cancel: async ({ request, locals }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const bountyId = String(form.get('bountyId') ?? '');
		try {
			await escrowService.cancelBountyWithRefund(caller, bountyId);
			return { action: 'cancel', bountyId, success: true };
		} catch (e) {
			return failureFor('cancel', bountyId, e);
		}
	}
};
