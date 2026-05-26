import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as dispute from '$lib/server/services/dispute.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	try {
		const caller = requireAuth(locals);
		const row = await dispute.getById(caller, params.disputeId!);
		return json({ dispute: row });
	} catch (e) {
		return respondError(e);
	}
};
