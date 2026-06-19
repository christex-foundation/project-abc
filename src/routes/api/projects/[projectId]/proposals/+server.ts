import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import { isUnlocked } from '$lib/server/access-lock';
import * as proposalService from '$lib/server/services/proposal.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const proposals = await proposalService.listForProject(caller, params.projectId);
		return json({ proposals });
	} catch (e) {
		return respondError(e);
	}
};

export const POST: RequestHandler = async ({ request, params, locals, cookies }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json();
		const proposal = await proposalService.submit(caller, params.projectId, body, {
			unlocked: isUnlocked(cookies, params.projectId)
		});
		return json({ proposal }, { status: 201 });
	} catch (e) {
		return respondError(e);
	}
};
