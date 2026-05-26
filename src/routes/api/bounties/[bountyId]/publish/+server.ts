import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const caller = requireAuth(locals);
		const waitUntil = platform?.context?.waitUntil;
		const enqueue = waitUntil
			? <T,>(p: Promise<T>) => waitUntil(p as Promise<unknown>)
			: undefined;
		const bounty = await bountyService.publish(caller, params.bountyId, enqueue);
		return json({ bounty });
	} catch (e) {
		return respondError(e);
	}
};
