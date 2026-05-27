/**
 * GET  /api/users/me/financial-account — return account ID, UVAN, and available balance.
 * POST /api/users/me/financial-account — ensure a financial account is provisioned.
 */
import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import {
	getAccountInfo,
	ensureCompanyAccount,
	ensureFreelancerAccount
} from '$lib/server/services/financial-account.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const caller = requireAuth(locals);
		const info = await getAccountInfo(caller);
		return json(info);
	} catch (e) {
		return respondError(e);
	}
};

export const POST: RequestHandler = async ({ locals }) => {
	try {
		const caller = requireAuth(locals);
		let accountId: string;
		if (caller.role === 'COMPANY') {
			accountId = await ensureCompanyAccount(caller);
		} else {
			accountId = await ensureFreelancerAccount(caller);
		}
		const info = await getAccountInfo(caller);
		return json({ accountId, uvan: info.uvan, balance: info.balance });
	} catch (e) {
		return respondError(e);
	}
};
