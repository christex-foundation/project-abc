import { redirect } from '@sveltejs/kit';
import { isAiEnabled } from '$lib/server/ai/ai-flag';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');
	if (locals.user.role !== 'COMPANY' && locals.user.role !== 'ADMIN') {
		throw redirect(303, '/');
	}
	// Gates the AI draft panel; when off the page just shows the two cards.
	return { aiEnabled: await isAiEnabled() };
};
