import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as projectService from '$lib/server/services/project.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const caller = requireAuth(locals);
		const waitUntil = platform?.context?.waitUntil;
		const enqueue = waitUntil ? <T>(p: Promise<T>) => waitUntil(p as Promise<unknown>) : undefined;
		const project = await projectService.publish(caller, params.projectId, enqueue);
		return json({ project });
	} catch (e) {
		return respondError(e);
	}
};
