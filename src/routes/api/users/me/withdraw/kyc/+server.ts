/**
 * GET /api/users/me/withdraw/kyc?phone=23277123456
 *
 * Verifies the holder name of a Sierra Leone mobile money number via the
 * Monime provider KYC endpoint. Called before initiating a withdrawal so the
 * user can confirm the destination account holder name.
 *
 * Uses `mobile-operator-lookup` to map the phone prefix to a Monime provider code
 * (Orange → m17, Africell → m18, Qcell → m13).
 */
import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { AppError, respondError } from '$lib/server/http';
import { verifyKycForWithdrawal } from '$lib/server/services/financial-account.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		requireAuth(locals);
		const phone = url.searchParams.get('phone');
		if (!phone) throw new AppError('BAD_REQUEST', 'Missing required query param: phone');
		const result = await verifyKycForWithdrawal(phone.trim());
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};
