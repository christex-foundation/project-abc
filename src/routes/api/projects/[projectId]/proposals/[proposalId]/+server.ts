import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as proposalService from '$lib/server/services/proposal.service';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const result = await proposalService.withdraw(caller, params.proposalId);
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};
