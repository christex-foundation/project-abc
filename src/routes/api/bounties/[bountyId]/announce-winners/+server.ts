import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as winnerService from '$lib/server/services/winner.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const result = await winnerService.announceWinners(caller, params.bountyId);
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};
