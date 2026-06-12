import { fail, error } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { AppError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import * as submissionService from '$lib/server/services/submission.service';
import * as winnerService from '$lib/server/services/winner.service';
import * as submissionRepo from '$lib/server/repositories/submission.repo';
import * as paymentRepo from '$lib/server/repositories/payment.repo';
import { PaymentType } from '@prisma/client';
import { majorToMinor } from '$lib/utils';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'COMPANY', 'ADMIN');

	let bounty;
	try {
		bounty = await bountyService.getBounty(caller, params.bountyId);
	} catch (e) {
		if (e instanceof AppError && e.code === 'NOT_FOUND') throw error(404, e.message);
		throw e;
	}

	// BOUNTY type: show winner payout breakdown (multiple winners, no tranches).
	if (bounty.type === 'BOUNTY') {
		const [winners, allPayments] = await Promise.all([
			submissionRepo.listWinners(params.bountyId),
			paymentRepo.listForBounty(params.bountyId)
		]);
		const prizePayments = allPayments.filter((p) => p.type === PaymentType.PRIZE_PAYOUT);
		return { bounty, winners, prizePayments, winner: null };
	}

	// PROJECT type: single winner, tranche payments (original behaviour).
	const submissions = await submissionService.listForBountyAsSponsor(caller, params.bountyId, {});
	const winner = submissions.find((s) => s.isWinner) ?? null;
	return { bounty, winner, winners: [], prizePayments: [] };
};

export const actions: Actions = {
	payTranche: async ({ request, locals }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const submissionId = String(form.get('submissionId') ?? '');
		// The tranche field is entered in major-unit Leones; convert to minor units.
		const amountMajor = Number(form.get('amount') ?? '');
		const amount = majorToMinor(amountMajor);
		const final = form.get('final') === '1';
		try {
			if (!Number.isFinite(amountMajor) || amount <= 0) {
				throw new AppError('BAD_REQUEST', 'Amount must be a positive amount.');
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
