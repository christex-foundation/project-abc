import { requireAuth } from '$lib/server/auth-helpers';
import * as notification from '$lib/server/services/notification.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	const notifications = await notification.listForCaller(caller, { limit: 100 });
	return { notifications };
};
