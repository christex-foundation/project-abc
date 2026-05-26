import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as notification from '$lib/server/services/notification.service';
import type { RequestHandler } from './$types';

const markReadInput = z.object({
	id: z.string().min(1).max(64),
	isRead: z.literal(true)
});

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const caller = requireAuth(locals);
		const unreadOnly = url.searchParams.get('unread') === '1';
		const notifications = await notification.listForCaller(caller, { limit: 50, unreadOnly });
		return json({ notifications });
	} catch (e) {
		return respondError(e);
	}
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	try {
		const caller = requireAuth(locals);
		const body = markReadInput.parse(await request.json());
		await notification.markRead(caller, body.id);
		return json({ ok: true });
	} catch (e) {
		return respondError(e);
	}
};
