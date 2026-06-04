import { error, redirect } from '@sveltejs/kit';
import { AppError } from '$lib/server/http';
import * as projectService from '$lib/server/services/project.service';
import * as reviewService from '$lib/server/services/review.service';
import { isAiEnabled } from '$lib/server/ai/ai-flag';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}
	try {
		const { project, milestones, role } = await projectService.getWorkspace(
			locals.user,
			params.slug
		);
		const reviews = await reviewService.listForProject(project.id);
		const myReview = reviews.find((r) => r.raterUserId === locals.user!.id) ?? null;
		const canReview =
			(role === 'OWNER' || role === 'CONTRACTOR') && project.status === 'COMPLETED' && !myReview;
		return {
			project,
			milestones,
			role,
			reviews,
			myReview,
			canReview,
			aiEnabled: await isAiEnabled()
		};
	} catch (e) {
		if (e instanceof AppError) {
			if (e.code === 'NOT_FOUND') throw error(404, e.message);
			if (e.code === 'FORBIDDEN') throw error(403, e.message);
		}
		throw e;
	}
};
