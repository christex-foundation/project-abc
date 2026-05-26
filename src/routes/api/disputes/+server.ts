import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as dispute from '$lib/server/services/dispute.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json();
		const created = await dispute.raiseDispute(caller, body);
		return json({ dispute: created }, { status: 201 });
	} catch (e) {
		return respondError(e);
	}
};
