import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as skill from '$lib/server/services/skill.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const body = await request.json();
		const created = await skill.createSkill(caller, body);
		return json({ skill: created }, { status: 201 });
	} catch (e) {
		return respondError(e);
	}
};
