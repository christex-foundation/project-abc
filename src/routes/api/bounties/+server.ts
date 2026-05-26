import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const params = Object.fromEntries(url.searchParams.entries());
		// `skillIds` may appear multiple times; collect explicitly.
		const skillIdsAll = url.searchParams.getAll('skillIds');
		const result = await bountyService.listBounties({
			...params,
			...(skillIdsAll.length ? { skillIds: skillIdsAll } : {})
		});
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json();
		const bounty = await bountyService.createBounty(caller, body);
		return json({ bounty }, { status: 201 });
	} catch (e) {
		return respondError(e);
	}
};
