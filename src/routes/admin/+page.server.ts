import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import * as admin from '$lib/server/services/admin.service';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const stats = await admin.getDashboardStats(locals.user);
	return { stats };
};
