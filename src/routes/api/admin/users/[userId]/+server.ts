import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as admin from '$lib/server/services/admin.service';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const body = await request.json();
		const updated = await admin.updateUser(caller, params.userId!, body);
		return json({ user: updated });
	} catch (e) {
		return respondError(e);
	}
};
