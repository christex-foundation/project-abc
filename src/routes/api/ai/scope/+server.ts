import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as scopingService from '$lib/server/services/scoping.service';
import type { RequestHandler } from './$types';

// Flow 1 decider: company describes their need; AI suggests BOUNTY vs PROJECT and
// drafts the brief. Role/flag/rate-limit guards live in the service.
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const caller = requireAuth(locals);
		const result = await scopingService.scopeWork(caller, await request.json());
		return json({ result });
	} catch (e) {
		return respondError(e);
	}
};
