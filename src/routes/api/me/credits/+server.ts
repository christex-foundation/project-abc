import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as creditService from '$lib/server/services/credit.service';
import { creditListQuery } from '$lib/validators/credit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		const caller = requireAuth(locals);
		const balance = await creditService.getBalanceForCaller(caller);
		if (!balance) {
			return json({ enabled: false });
		}
		const query = creditListQuery.parse(Object.fromEntries(url.searchParams.entries()));
		const transactions = await creditService.listTransactionsForCaller(caller, query);
		return json({ enabled: true, ...balance, transactions });
	} catch (e) {
		return respondError(e);
	}
};
