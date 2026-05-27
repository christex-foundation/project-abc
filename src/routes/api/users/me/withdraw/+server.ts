/**
 * POST /api/users/me/withdraw
 *
 * Initiates a withdrawal from the caller's Monime financial account to a
 * mobile money number. KYC is verified inline before the payout is created.
 *
 * Body: { phoneNumber: string; amount: number }
 *   - phoneNumber: full SL number without '+', e.g. "23277123456"
 *   - amount: in minor units (SLE cents)
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
	/** Full Sierra Leone phone number without '+', e.g. "23277123456" */
	phoneNumber: z.string().min(8).max(20),
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
