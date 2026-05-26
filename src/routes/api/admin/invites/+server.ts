import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as inviteService from '$lib/server/services/invite.service';
import { createCompanyInviteSchema } from '$lib/validators/invite';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const body = createCompanyInviteSchema.parse(await request.json());
		const result = await inviteService.createCompanyInvite(caller, body);
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const caller = requireAuth(locals);
		const list = await inviteService.listInvites(caller);
		return json({ invites: list });
	} catch (e) {
		return respondError(e);
	}
};
