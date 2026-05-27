import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as escrowService from '$lib/server/services/escrow.service';
import type { RequestHandler } from './$types';

const fundInput = z.object({
	/** 'internal_transfer' draws from the company's Monime financial account balance.
	 *  'checkout' (default) redirects to the Monime hosted checkout page. */
	method: z.enum(['checkout', 'internal_transfer']).default('checkout')
});

export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		const caller = requireAuth(locals);

		let method: 'checkout' | 'internal_transfer' = 'checkout';
		const contentType = request.headers.get('content-type') ?? '';
		if (contentType.includes('application/json')) {
			const body = await request.json().catch(() => ({}));
			const parsed = fundInput.safeParse(body);
			if (parsed.success) method = parsed.data.method;
		}

		if (method === 'internal_transfer') {
			await escrowService.fundFromFinancialAccount(caller, params.bountyId);
			return json({ success: true });
		}

		// Default: hosted checkout session
		const result = await escrowService.createFundingCheckoutSession(caller, params.bountyId);
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};
