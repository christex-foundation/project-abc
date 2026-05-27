import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as creditService from '$lib/server/services/credit.service';
import { creditListQuery } from '$lib/validators/credit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const query = creditListQuery.parse(Object.fromEntries(url.searchParams.entries()));
		const data = await creditService.getForAdmin(caller, params.freelancerId, query);
		return json(data);
	} catch (e) {
		return respondError(e);
	}
};
