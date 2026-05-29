import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as projectEscrowService from '$lib/server/services/project-escrow.service';
import type { RequestHandler } from './$types';

// Mediation outcome: refund the remaining escrow to the company and cancel.
export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const project = await projectEscrowService.cancelProjectWithRefund(caller, params.projectId);
		return json({ project });
	} catch (e) {
		return respondError(e);
	}
};
