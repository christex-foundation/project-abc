import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as proofOfWorkService from '$lib/server/services/proofOfWork.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const caller = requireAuth(locals);
		const items = await proofOfWorkService.list(caller);
		return json({ proofOfWork: items });
	} catch (e) {
		return respondError(e);
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json();
		const item = await proofOfWorkService.create(caller, body);
		return json({ proofOfWork: item }, { status: 201 });
	} catch (e) {
		return respondError(e);
	}
};
