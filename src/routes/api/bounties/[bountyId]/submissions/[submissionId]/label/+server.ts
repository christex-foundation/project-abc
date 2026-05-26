import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as submissionService from '$lib/server/services/submission.service';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json();
		const submission = await submissionService.setLabel(caller, params.submissionId, body);
		return json({ submission });
	} catch (e) {
		return respondError(e);
	}
};
