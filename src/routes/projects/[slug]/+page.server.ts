import { error } from '@sveltejs/kit';
import { AppError } from '$lib/server/http';
import * as projectService from '$lib/server/services/project.service';
import { stripHtml } from '$lib/server/seo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const project = await projectService.getProject(locals.user ?? null, params.slug);

		// Surface whether the viewer is the owning company or the awarded contractor
		// so the page can show the right call-to-action (apply / open workspace).
		let viewerRole: 'OWNER' | 'CONTRACTOR' | 'FREELANCER' | 'GUEST' = 'GUEST';
		if (locals.user) {
			if (locals.user.role === 'FREELANCER') viewerRole = 'FREELANCER';
			if (project.contractorProfileId && locals.user.role === 'FREELANCER') {
				// Contractor identity is resolved on the apply/workspace pages; the
				// public detail only needs to know "is a freelancer" for the CTA.
			}
		}

		return {
			project,
			viewerRole,
			pageMetaTags: {
				title: project.title,
				description: stripHtml(project.description) || `Apply to ${project.title} on FOW.`
			}
		};
	} catch (e) {
		if (e instanceof AppError) {
			if (e.code === 'NOT_FOUND') throw error(404, e.message);
			if (e.code === 'FORBIDDEN') throw error(403, e.message);
		}
		throw e;
	}
};
