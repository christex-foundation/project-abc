import { error, fail } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { AppError } from '$lib/server/http';
import * as projectService from '$lib/server/services/project.service';
import * as proposalService from '$lib/server/services/proposal.service';
import * as reviewService from '$lib/server/services/review.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'COMPANY', 'ADMIN');
	try {
		const project = await projectService.getProject(caller, params.projectId);
		const proposals = await proposalService.listForProject(caller, project.id);
		// Aggregate rating per applicant (by their user id), for reputation at a glance.
		const ratings: Record<string, { avg: number | null; count: number }> = {};
		await Promise.all(
			proposals.map(async (p) => {
				const uid = p.freelancer?.user?.id;
				if (uid && !ratings[uid]) ratings[uid] = await reviewService.getAggregate(uid);
			})
		);
		return { project, proposals, ratings };
	} catch (e) {
		if (e instanceof AppError) {
			if (e.code === 'NOT_FOUND') throw error(404, e.message);
			if (e.code === 'FORBIDDEN') throw error(403, e.message);
		}
		throw e;
	}
};

export const actions: Actions = {
	award: async ({ request, params, locals }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const proposalId = String(form.get('proposalId') ?? '');
		try {
			await proposalService.award(caller, params.projectId, proposalId);
			return { action: 'award', proposalId, success: true };
		} catch (e) {
			if (e instanceof AppError) {
				return fail(e.httpStatus, { action: 'award', proposalId, message: e.message });
			}
			console.error('[dashboard:project:award]', e);
			return fail(500, { action: 'award', proposalId, message: 'Something went wrong.' });
		}
	}
};
