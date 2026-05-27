import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as account from '$lib/server/services/account.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const user = requireAuth(locals);
		const blockers = await account.getDeletionBlockers(user);
		return json({ blockers });
	} catch (e) {
		return respondError(e);
	}
};
