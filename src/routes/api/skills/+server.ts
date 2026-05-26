import { json } from '@sveltejs/kit';
import { respondError } from '$lib/server/http';
import * as skillService from '$lib/server/services/skill.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const categories = await skillService.listSkills();
		return json({ categories });
	} catch (e) {
		return respondError(e);
	}
};
