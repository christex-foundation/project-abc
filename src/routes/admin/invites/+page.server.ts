import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as inviteService from '$lib/server/services/invite.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'ADMIN');
	return { invites: await inviteService.listInvites(caller) };
};
