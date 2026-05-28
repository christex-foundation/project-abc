/**
 * /api/users/me/withdrawal-destination
 *
 * The caller's verified mobile money number that prize payouts (freelancers)
 * and refunds (companies) flow to. Set once at wallet setup; reused on every
 * withdrawal so the user never re-verifies the same number.
 *
 *   GET  → { phone, holderName, providerName, verifiedAt } | { destination: null }
 *   POST { phone } → verifies KYC then persists; returns the saved destination
 */
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAuth } from '$lib/server/auth-helpers';
import { AppError, respondError } from '$lib/server/http';
import {
	getWithdrawalDestination,
	setWithdrawalDestination
} from '$lib/server/services/financial-account.service';
import * as walletService from '$lib/server/services/wallet.service';
import type { RequestHandler } from './$types';

const setInput = z.object({
	/** Full Sierra Leone mobile money number without '+', e.g. "23277123456". */
	phone: z.string().min(8).max(20)
});

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const caller = requireAuth(locals);
		const destination = await getWithdrawalDestination(caller);
		return json({ destination });
	} catch (e) {
		return respondError(e);
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json().catch(() => {
			throw new AppError('BAD_REQUEST', 'Request body must be valid JSON.');
		});
		const parsed = setInput.safeParse(body);
		if (!parsed.success) {
			throw new AppError('BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid input.');
		}
		const destination = await setWithdrawalDestination(caller, parsed.data.phone.trim());
		// Invalidate the cached wallet summary so the TopNav reflects the new state.
		walletService.invalidate(caller);
		return json({ destination });
	} catch (e) {
		return respondError(e);
	}
};
