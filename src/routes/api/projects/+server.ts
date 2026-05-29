import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as projectService from '$lib/server/services/project.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const params = Object.fromEntries(url.searchParams.entries());
		const skillIdsAll = url.searchParams.getAll('skillIds');
		const result = await projectService.listProjects({
			...params,
			...(skillIdsAll.length ? { skillIds: skillIdsAll } : {})
		});
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json();
		const project = await projectService.createProject(caller, body);
		return json({ project }, { status: 201 });
	} catch (e) {
		return respondError(e);
	}
};
