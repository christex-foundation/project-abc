import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as dispute from '$lib/server/services/dispute.service';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const body = await request.json();
		const updated = await dispute.update(caller, params.disputeId!, body);
		return json({ dispute: updated });
	} catch (e) {
		return respondError(e);
	}
};
