import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as coachService from '$lib/server/services/coach.service';
import type { RequestHandler } from './$types';

// Flow 4 — workspace coach (contractor milestone delivery). Thin: auth →
// service → error mapping. The service enforces requireRole('FREELANCER'), the
// AI flag, the rate limit, and that the caller is THIS project's contractor.
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const caller = requireAuth(locals);
		const result = await coachService.coachWorkspace(caller, await request.json());
		return json({ result });
	} catch (e) {
		return respondError(e);
	}
};
