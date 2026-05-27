import { error, fail, redirect } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { AppError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import * as submissionService from '$lib/server/services/submission.service';
import * as creditService from '$lib/server/services/credit.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'FREELANCER');

	let bounty;
	try {
		bounty = await bountyService.getBounty(caller, params.slug);
	} catch (e) {
		if (e instanceof AppError && e.code === 'NOT_FOUND') throw error(404, e.message);
		throw e;
	}
	if (bounty.status !== 'ACTIVE') {
		throw error(409, 'This bounty is not accepting submissions.');
	}
	if (new Date(bounty.submissionDeadline).getTime() <= Date.now()) {
		throw error(409, 'The submission deadline has passed.');
	}
	const credits = await creditService.getBalanceForCaller(caller);
	return { bounty, credits };
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const caller = requireAuth(locals);

		const form = await request.formData();
		const link = String(form.get('link') ?? '').trim();
		const tweetRaw = String(form.get('tweet') ?? '').trim();
		const otherInfo = String(form.get('otherInfo') ?? '').trim();
		const askRaw = String(form.get('ask') ?? '').trim();

		// Eligibility answers come in as `eligibility[<question>]` fields so that
		// they survive form-encoding without losing question context.
		const answers: Array<{ question: string; answer: string }> = [];
		for (const [key, value] of form.entries()) {
			const m = /^eligibility\[(.+)\]$/.exec(key);
			if (m) answers.push({ question: m[1], answer: String(value) });
		}

		const payload = {
			link,
			tweet: tweetRaw || null,
			otherInfo: otherInfo || null,
			ask: askRaw ? Number(askRaw) : null,
			eligibilityAnswers: answers
		};

		// Look up the bounty by slug to translate it to the id the service needs.
		let bounty;
		try {
			bounty = await bountyService.getBounty(caller, params.slug!);
		} catch (e) {
			if (e instanceof AppError) {
				return fail(e.httpStatus, { message: e.message, values: payload });
			}
			throw e;
		}

		try {
			await submissionService.create(caller, bounty.id, payload);
		} catch (e) {
			if (e instanceof AppError) {
				return fail(e.httpStatus, { message: e.message, values: payload });
			}
			console.error('[submit]', e);
			return fail(500, { message: 'Something went wrong.', values: payload });
		}

		throw redirect(303, '/dashboard/freelancer/submissions');
	}
};
