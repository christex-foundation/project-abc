import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		try {
			await auth.api.signOut({ headers: request.headers });
		} catch {
			// Already-expired session: still fall through to cookie cleanup + redirect.
		}
		for (const c of cookies.getAll()) {
			if (c.name.includes('better-auth')) {
				cookies.delete(c.name, { path: '/' });
			}
		}
		redirect(303, '/');
	}
};
