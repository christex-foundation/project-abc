import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as referralService from '$lib/server/services/referral.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const caller = requireAuth(locals);
		const status = await referralService.getMyReferralStatus(caller);
		if (!status) return json({ enabled: false });
		return json(status);
	} catch (e) {
		return respondError(e);
	}
};
