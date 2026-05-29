import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as reviewService from '$lib/server/services/review.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json();
		const review = await reviewService.submit(caller, params.projectId, body);
		return json({ review }, { status: 201 });
	} catch (e) {
		return respondError(e);
	}
};
