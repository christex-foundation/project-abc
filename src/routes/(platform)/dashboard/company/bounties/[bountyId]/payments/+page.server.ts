import { fail, error } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { AppError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import * as submissionService from '$lib/server/services/submission.service';
import * as winnerService from '$lib/server/services/winner.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'COMPANY', 'ADMIN');

	let bounty;
	try {
		bounty = await bountyService.getBounty(caller, params.bountyId);
	} catch (e) {
		if (e instanceof AppError && e.code === 'NOT_FOUND') throw error(404, e.message);
		throw e;
	}
	if (bounty.type !== 'PROJECT') {
		throw error(404, 'Tranches are only used for PROJECT bounties.');
	}
	const submissions = await submissionService.listForBountyAsSponsor(caller, params.bountyId, {});
	const winner = submissions.find((s) => s.isWinner) ?? null;
	return { bounty, winner };
};

export const actions: Actions = {
	payTranche: async ({ request, locals }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const submissionId = String(form.get('submissionId') ?? '');
		const amount = Number(form.get('amount') ?? '');
		const final = form.get('final') === '1';
		try {
			if (!Number.isFinite(amount) || amount <= 0) {
				throw new AppError('BAD_REQUEST', 'Amount must be a positive integer.');
			}
			await winnerService.payProjectTranche(caller, submissionId, amount, final);
			return { action: 'payTranche', submissionId, success: true };
		} catch (e) {
			if (e instanceof AppError) {
				return fail(e.httpStatus, {
					action: 'payTranche',
					submissionId,
					message: e.message
				});
			}
			console.error('[payments:payTranche]', e);
			return fail(500, {
				action: 'payTranche',
				submissionId,
				message: 'Something went wrong.'
			});
		}
	}
};
