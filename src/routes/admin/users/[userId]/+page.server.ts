import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import * as admin from '$lib/server/services/admin.service';
import * as account from '$lib/server/services/account.service';
import { resolveAvatar } from '$lib/server/avatar';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	try {
		const [detail, deletionBlockers] = await Promise.all([
			admin.getUserDetail(locals.user, params.userId),
			account.adminGetDeletionBlockers(locals.user, params.userId)
		]);
		const avatar = resolveAvatar(detail.user.image, detail.user.name ?? detail.user.email);
		return { detail, deletionBlockers, currentUserId: locals.user.id, avatar };
	} catch (e) {
		throw error(404, 'User not found');
	}
};
