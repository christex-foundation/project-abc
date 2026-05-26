import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as skill from '$lib/server/services/skill.service';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const body = await request.json();
		const updated = await skill.renameSkill(caller, params.skillId!, body);
		return json({ skill: updated });
	} catch (e) {
		return respondError(e);
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		await skill.deleteSkill(caller, params.skillId!);
		return json({ ok: true });
	} catch (e) {
		return respondError(e);
	}
};
