import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as submissionService from '$lib/server/services/submission.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	try {
		const caller = requireAuth(locals);
		const query = Object.fromEntries(url.searchParams.entries());
		const submissions = await submissionService.listForBountyAsSponsor(
			caller,
			params.bountyId,
			query
		);
		return json({ submissions });
	} catch (e) {
		return respondError(e);
	}
};

export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json();
		const submission = await submissionService.create(caller, params.bountyId, body);
		return json({ submission }, { status: 201 });
	} catch (e) {
		return respondError(e);
	}
};
