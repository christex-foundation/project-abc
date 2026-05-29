import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as projectEscrowService from '$lib/server/services/project-escrow.service';
import type { RequestHandler } from './$types';

const fundInput = z.object({
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
			await projectEscrowService.fundFromFinancialAccount(caller, params.projectId);
			return json({ success: true });
		}

		const result = await projectEscrowService.createFundingCheckoutSession(
			caller,
			params.projectId
		);
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};
