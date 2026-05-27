import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as proofOfWorkService from '$lib/server/services/proofOfWork.service';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json();
		const item = await proofOfWorkService.update(caller, params.id, body);
		return json({ proofOfWork: item });
	} catch (e) {
		return respondError(e);
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	try {
		const caller = requireAuth(locals);
		await proofOfWorkService.remove(caller, params.id);
		return json({ ok: true });
	} catch (e) {
		return respondError(e);
	}
};
