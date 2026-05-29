import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as proposalService from '$lib/server/services/proposal.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const caller = requireAuth(locals);
		const proposals = await proposalService.listForFreelancer(caller);
		return json({ proposals });
	} catch (e) {
		return respondError(e);
	}
};
