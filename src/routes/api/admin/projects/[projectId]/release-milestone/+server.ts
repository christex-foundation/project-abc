import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as milestoneService from '$lib/server/services/milestone.service';
import type { RequestHandler } from './$types';

// Mediation outcome: release the current active milestone to the contractor.
export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const milestone = await milestoneService.adminReleaseMilestone(caller, params.projectId);
		return json({ milestone });
	} catch (e) {
		return respondError(e);
	}
};
