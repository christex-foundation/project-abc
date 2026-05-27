import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import * as admin from '$lib/server/services/admin.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	try {
		const detail = await admin.getUserDetail(locals.user, params.userId);
		return { detail, currentUserId: locals.user.id };
	} catch (e) {
		throw error(404, 'User not found');
	}
};
