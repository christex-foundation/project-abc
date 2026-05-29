import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as proposalService from '$lib/server/services/proposal.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const project = await proposalService.award(caller, params.projectId, params.proposalId);
		return json({ project });
	} catch (e) {
		return respondError(e);
	}
};
