import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import * as admin from '$lib/server/services/admin.service';
import * as account from '$lib/server/services/account.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	try {
		const [detail, deletionBlockers] = await Promise.all([
			admin.getUserDetail(locals.user, params.userId),
			account.adminGetDeletionBlockers(locals.user, params.userId)
		]);
		return { detail, deletionBlockers, currentUserId: locals.user.id };
	} catch (e) {
		throw error(404, 'User not found');
	}
};
