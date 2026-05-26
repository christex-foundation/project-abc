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
			throw redirect(303, '/dashboard/company/bounties');
		case 'FREELANCER':
			// Freelancer dashboard subroutes land in Phase 4 (submissions / earnings).
			// Until then, send them to the public browse so the link doesn't 404.
			throw redirect(303, '/bounties');
		case 'ADMIN':
			throw redirect(303, '/admin');
	}
};
