import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as escrowService from '$lib/server/services/escrow.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const bounty = await escrowService.cancelBountyWithRefund(caller, params.bountyId);
		return json({ bounty });
	} catch (e) {
		return respondError(e);
	}
};
