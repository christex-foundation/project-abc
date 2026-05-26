import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Role-based dashboard router (plan §1). Authenticated users land on the
 * dashboard surface that matches their role. Anonymous → /login (the
 * (platform) layout guard handles that before this load runs).
 */
export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');
	switch (locals.user.role) {
		case 'COMPANY':
			throw redirect(303, '/dashboard/company');
		case 'FREELANCER':
			throw redirect(303, '/dashboard/freelancer');
		case 'ADMIN':
			throw redirect(303, '/admin');
	}
};
