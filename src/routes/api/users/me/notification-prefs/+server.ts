import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as notification from '$lib/server/services/notification.service';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	try {
		const caller = requireAuth(locals);
		const prefs = await notification.updatePreferences(caller, await request.json());
		return json({ prefs });
	} catch (e) {
		return respondError(e);
	}
};
