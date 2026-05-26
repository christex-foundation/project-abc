import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as payment from '$lib/server/services/payment.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const updated = await payment.retryPayout(caller, params.paymentId!);
		return json({ payment: updated });
	} catch (e) {
		return respondError(e);
	}
};
