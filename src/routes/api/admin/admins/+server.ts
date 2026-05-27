import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as inviteService from '$lib/server/services/invite.service';
import { createAdminInviteSchema } from '$lib/validators/invite';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const body = createAdminInviteSchema.parse(await request.json());
		const result = await inviteService.createAdminInvite(caller, body);
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};
