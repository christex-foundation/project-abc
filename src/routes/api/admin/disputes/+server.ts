import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as dispute from '$lib/server/services/dispute.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const status = url.searchParams.get('status') ?? undefined;
		const disputes = await dispute.listForAdmin(caller, { status });
		return json({ disputes });
	} catch (e) {
		return respondError(e);
	}
};
