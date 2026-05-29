import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as milestoneService from '$lib/server/services/milestone.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const milestone = await milestoneService.approve(caller, params.milestoneId);
		return json({ milestone });
	} catch (e) {
		return respondError(e);
	}
};
