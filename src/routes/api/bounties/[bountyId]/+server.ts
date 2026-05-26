import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const bounty = await bountyService.getBounty(locals.user, params.bountyId);
		return json({ bounty });
	} catch (e) {
		return respondError(e);
	}
};

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json();
		const bounty = await bountyService.updateBounty(caller, params.bountyId, body);
		return json({ bounty });
	} catch (e) {
		return respondError(e);
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		await bountyService.deleteDraft(caller, params.bountyId);
		return json({ ok: true });
	} catch (e) {
		return respondError(e);
	}
};
