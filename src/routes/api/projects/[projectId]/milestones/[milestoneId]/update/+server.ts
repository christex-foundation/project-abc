import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as milestoneService from '$lib/server/services/milestone.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json();
		const milestone = await milestoneService.postUpdate(caller, params.milestoneId, body);
		return json({ milestone }, { status: 201 });
	} catch (e) {
		return respondError(e);
	}
};
