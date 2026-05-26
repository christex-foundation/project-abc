import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError, AppError } from '$lib/server/http';
import * as winnerService from '$lib/server/services/winner.service';
import { payTrancheInput } from '$lib/validators/submission';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json().catch(() => {
			throw new AppError('BAD_REQUEST', 'Invalid JSON body.');
		});
		const parsed = payTrancheInput.parse(body);
		const result = await winnerService.payProjectTranche(
			caller,
			params.submissionId,
			parsed.amount,
			parsed.final
		);
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};
