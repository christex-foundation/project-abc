import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import * as admin from '$lib/server/services/admin.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	try {
		const detail = await admin.getBountyDetail(locals.user, params.bountyId);
		return detail;
	} catch (e) {
		throw error(404, 'Bounty not found');
	}
};
