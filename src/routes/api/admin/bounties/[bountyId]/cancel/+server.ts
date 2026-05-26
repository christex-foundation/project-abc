import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as escrow from '$lib/server/services/escrow.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const bounty = await escrow.cancelBountyWithRefund(caller, params.bountyId!);
		return json({ bounty });
	} catch (e) {
		return respondError(e);
	}
};
