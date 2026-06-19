import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import { readUnlockedIds } from '$lib/server/access-lock';
import * as projectService from '$lib/server/services/project.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		const project = await projectService.getProject(locals.user, params.projectId, {
			unlockedIds: readUnlockedIds(cookies)
		});
		return json({ project });
	} catch (e) {
		return respondError(e);
	}
};

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json();
		const project = await projectService.updateProject(caller, params.projectId, body);
		return json({ project });
	} catch (e) {
		return respondError(e);
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		await projectService.deleteDraft(caller, params.projectId);
		return json({ ok: true });
	} catch (e) {
		return respondError(e);
	}
};
