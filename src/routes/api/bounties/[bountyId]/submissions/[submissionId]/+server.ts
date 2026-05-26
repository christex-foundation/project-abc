import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as submissionService from '$lib/server/services/submission.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const result = await submissionService.getForCaller(caller, params.submissionId);
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};
