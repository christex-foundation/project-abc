// TODO: rate-limit (Phase 7) — plan §15 specifies 10/min for push subscribe.
import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as notification from '$lib/server/services/notification.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const caller = requireAuth(locals);
		await notification.savePushSubscription(caller, await request.json());
		return json({ ok: true });
	} catch (e) {
		return respondError(e);
	}
};
