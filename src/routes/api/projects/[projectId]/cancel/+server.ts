import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as projectEscrowService from '$lib/server/services/project-escrow.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const project = await projectEscrowService.cancelProjectWithRefund(caller, params.projectId);
		return json({ project });
	} catch (e) {
		return respondError(e);
	}
};
