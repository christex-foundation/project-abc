import { fail, error } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { AppError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import * as submissionService from '$lib/server/services/submission.service';
import * as winnerService from '$lib/server/services/winner.service';
import { SubmissionLabel, SubmissionStatus } from '@prisma/client';
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
	const submissions = await submissionService.listForBountyAsSponsor(caller, params.bountyId, {});
	return { bounty, submissions };
};

function failureFor(action: string, submissionId: string | null, e: unknown) {
	if (e instanceof AppError) {
		return fail(e.httpStatus, { action, submissionId, message: e.message });
	}
	console.error(`[triage:${action}]`, e);
	return fail(500, { action, submissionId, message: 'Something went wrong.' });
}

export const actions: Actions = {
	label: async ({ request, locals }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const submissionId = String(form.get('submissionId') ?? '');
		const label = String(form.get('label') ?? '');
		try {
			if (!Object.values(SubmissionLabel).includes(label as SubmissionLabel)) {
				throw new AppError('BAD_REQUEST', 'Unknown label.');
			}
			await submissionService.setLabel(caller, submissionId, { label });
			return { action: 'label', submissionId, success: true };
		} catch (e) {
			return failureFor('label', submissionId, e);
		}
	},
	notes: async ({ request, locals }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const submissionId = String(form.get('submissionId') ?? '');
		try {
			await submissionService.setNotes(caller, submissionId, {
				notes: String(form.get('notes') ?? '')
			});
			return { action: 'notes', submissionId, success: true };
		} catch (e) {
			return failureFor('notes', submissionId, e);
		}
	},
	feedback: async ({ request, locals }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const submissionId = String(form.get('submissionId') ?? '');
		try {
			await submissionService.setFeedback(caller, submissionId, {
				feedback: String(form.get('feedback') ?? '')
			});
			return { action: 'feedback', submissionId, success: true };
		} catch (e) {
			return failureFor('feedback', submissionId, e);
		}
	},
	toggleWinner: async ({ request, locals }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const submissionId = String(form.get('submissionId') ?? '');
		const isWinner = form.get('isWinner') === '1';
		const positionRaw = form.get('position');
		try {
			await submissionService.toggleWinner(caller, submissionId, {
				isWinner,
				position: positionRaw != null && positionRaw !== '' ? Number(positionRaw) : null
			});
			return { action: 'toggleWinner', submissionId, success: true };
		} catch (e) {
			return failureFor('toggleWinner', submissionId, e);
		}
	},
	judging: async ({ params, locals }) => {
		const caller = requireAuth(locals);
		try {
			await winnerService.transitionToJudging(caller, params.bountyId!);
			return { action: 'judging', submissionId: null, success: true };
		} catch (e) {
			return failureFor('judging', null, e);
		}
	},
	announce: async ({ params, locals }) => {
		const caller = requireAuth(locals);
		try {
			await winnerService.announceWinners(caller, params.bountyId!);
			return { action: 'announce', submissionId: null, success: true };
		} catch (e) {
			return failureFor('announce', null, e);
		}
	},
	shortlist: async ({ request, locals }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const submissionId = String(form.get('submissionId') ?? '');
		try {
			await submissionService.setSubmissionStatus(caller, submissionId, SubmissionStatus.APPROVED);
			return { action: 'shortlist', submissionId, success: true };
		} catch (e) {
			return failureFor('shortlist', submissionId, e);
		}
	},
	reject: async ({ request, locals }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const submissionId = String(form.get('submissionId') ?? '');
		try {
			await submissionService.setSubmissionStatus(caller, submissionId, SubmissionStatus.REJECTED);
			return { action: 'reject', submissionId, success: true };
		} catch (e) {
			return failureFor('reject', submissionId, e);
		}
	}
};
