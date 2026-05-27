import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as admin from '$lib/server/services/admin.service';
import type { RequestHandler } from './$types';

const input = z.object({ creditsExempt: z.boolean() });

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	try {
		const caller = requireAuth(locals);
		const body = input.parse(await request.json());
		const bounty = await admin.setBountyCreditsExempt(caller, params.bountyId, body.creditsExempt);
		return json({ bounty });
	} catch (e) {
		return respondError(e);
	}
};
