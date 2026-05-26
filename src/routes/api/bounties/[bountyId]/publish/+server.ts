import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const bounty = await bountyService.publish(caller, params.bountyId);
		return json({ bounty });
	} catch (e) {
		return respondError(e);
	}
};
