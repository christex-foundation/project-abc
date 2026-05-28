/**
 * POST /api/users/me/withdraw
 *
 * Initiates a withdrawal from the caller's wallet to their saved, verified
 * mobile money number. The destination must have been configured via
 * POST /api/users/me/withdrawal-destination before calling this endpoint.
 *
 * Body: { amount: number } — minor units (SLE cents)
 *
 * Returns: { withdrawalId: string; monimePayoutId: string }
 *
 * The payout is asynchronous. The final status (COMPLETED / FAILED) is
 * delivered via the Monime webhook → escrow.service.handleWebhook().
 */
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAuth } from '$lib/server/auth-helpers';
import { AppError, respondError } from '$lib/server/http';
import { withdraw } from '$lib/server/services/financial-account.service';
import type { RequestHandler } from './$types';

const withdrawInput = z.object({
	/** Amount in minor units (SLE cents). Must be positive. */
	amount: z.number().int().positive()
});

export const POST: RequestHandler = async ({ locals, request }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json().catch(() => {
			throw new AppError('BAD_REQUEST', 'Request body must be valid JSON.');
		});
		const parsed = withdrawInput.safeParse(body);
		if (!parsed.success) {
			throw new AppError('BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid input.');
		}
		const result = await withdraw(caller, parsed.data);
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};
