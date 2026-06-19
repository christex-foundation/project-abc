import { error, redirect } from '@sveltejs/kit';
import { AppError } from '$lib/server/http';
import { isUnlocked, readUnlockedIds } from '$lib/server/access-lock';
import * as projectService from '$lib/server/services/project.service';
import * as proposalService from '$lib/server/services/proposal.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url, cookies }) => {
	if (!locals.user) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}
	if (locals.user.role !== 'FREELANCER') {
		throw redirect(303, `/projects/${params.slug}`);
	}

	try {
		const project = await projectService.getProject(locals.user, params.slug, {
			unlockedIds: readUnlockedIds(cookies)
		});
		if (project.status !== 'OPEN') {
			throw redirect(303, `/projects/${project.slug}`);
		}
		// PIN-locked and not unlocked → send them to the detail page to unlock first.
		if (project.locked) {
			throw redirect(303, `/projects/${project.slug}`);
		}
		// Province + PIN gate pre-flight; surfaces the reason before the form loads.
		await proposalService.assertCanApply(locals.user, project.id, {
			unlocked: isUnlocked(cookies, project.id)
		});
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
