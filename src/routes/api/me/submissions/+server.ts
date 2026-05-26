import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as submissionService from '$lib/server/services/submission.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const caller = requireAuth(locals);
		const submissions = await submissionService.listForFreelancer(caller);
		return json({ submissions });
	} catch (e) {
		return respondError(e);
	}
};
