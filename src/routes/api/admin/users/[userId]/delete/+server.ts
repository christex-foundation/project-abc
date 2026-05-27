import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as account from '$lib/server/services/account.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const body = await request.json().catch(() => ({}));
		const result = await account.adminDeleteUser(caller, params.userId!, body);
		return json({ ok: true, ...result });
	} catch (e) {
		return respondError(e);
	}
};
