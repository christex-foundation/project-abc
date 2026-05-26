import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');
	if (locals.user.role !== 'COMPANY' && locals.user.role !== 'ADMIN') {
		throw redirect(303, '/');
	}
	return {};
};
