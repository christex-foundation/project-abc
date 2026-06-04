import { error } from '@sveltejs/kit';
import { AppError } from '$lib/server/http';
import * as projectService from '$lib/server/services/project.service';
import * as proposalService from '$lib/server/services/proposal.service';
import { isAiEnabled } from '$lib/server/ai/ai-flag';
import { stripHtml } from '$lib/server/seo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const caller = locals.user ?? null;
		const project = await projectService.getProject(caller, params.slug);

		// Surface whether the viewer is the owning company (or admin) so the page can
		// show the owner-only "View proposals" call-to-action. Proposals only exist
		// once the project is past DRAFT, so we only fetch the count when relevant.
		const isOwner = await projectService.isOwner(caller, project.companyProfileId);
		let proposalCount = 0;
		if (isOwner && caller && project.status !== 'DRAFT') {
			proposalCount = await proposalService.countForProject(caller, project.id);
		}

		return {
			project,
			isOwner,
			proposalCount,
			// Gates the freelancer "Coach me" panel; off → panel is absent.
			aiEnabled: await isAiEnabled(),
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
