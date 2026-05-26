import { redirect } from '@sveltejs/kit';
import * as skillService from '$lib/server/services/skill.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');
	if (locals.user.role !== 'COMPANY' && locals.user.role !== 'ADMIN') {
		throw redirect(303, '/');
	}
	const categories = await skillService.listSkills();
	return { categories };
};
