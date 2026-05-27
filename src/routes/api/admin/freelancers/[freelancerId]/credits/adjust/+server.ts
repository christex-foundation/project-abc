import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as creditService from '$lib/server/services/credit.service';
import { creditAdjustInput } from '$lib/validators/credit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, params }) => {
	try {
		const caller = requireAuth(locals);
		const body = creditAdjustInput.parse(await request.json());
		const result = await creditService.adminAdjust(
			caller,
			params.freelancerId,
			body.delta,
			body.notes
		);
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};
