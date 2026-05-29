import { error, redirect } from '@sveltejs/kit';
import { AppError } from '$lib/server/http';
import * as projectService from '$lib/server/services/project.service';
import * as proposalService from '$lib/server/services/proposal.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}
	if (locals.user.role !== 'FREELANCER') {
		throw redirect(303, `/projects/${params.slug}`);
	}

	try {
		const project = await projectService.getProject(locals.user, params.slug);
		if (project.status !== 'OPEN') {
			throw redirect(303, `/projects/${project.slug}`);
		}
		const alreadyApplied = await proposalService.hasApplied(locals.user, project.id);
		return { project, alreadyApplied };
	} catch (e) {
		if (e instanceof AppError) {
			if (e.code === 'NOT_FOUND') throw error(404, e.message);
			if (e.code === 'FORBIDDEN') throw error(403, e.message);
		}
		throw e;
	}
};
