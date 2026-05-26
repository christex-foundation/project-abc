import { json } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as settingsService from '$lib/server/services/settings.service';
import { updateSettingSchema } from '$lib/validators/settings';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	try {
		const caller = requireAuth(locals);
		requireRole(caller, 'ADMIN');
		const body = updateSettingSchema.parse(await request.json());
		const updated = await settingsService.update(caller, body.key, body.value);
		return json({ setting: updated });
	} catch (e) {
		return respondError(e);
	}
};
