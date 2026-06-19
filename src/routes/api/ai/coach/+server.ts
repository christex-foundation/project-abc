import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as coachService from '$lib/server/services/coach.service';
import { readUnlockedIds } from '$lib/server/access-lock';
import type { RequestHandler } from './$types';

// Flow 3 — freelancer coach. Thin: auth → service → error mapping. The service
// enforces requireRole('FREELANCER'), the AI flag, and the rate limit.
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		const caller = requireAuth(locals);
		const result = await coachService.coachWork(caller, await request.json(), {
			unlockedIds: readUnlockedIds(cookies)
		});
		return json({ result });
	} catch (e) {
		return respondError(e);
	}
};
