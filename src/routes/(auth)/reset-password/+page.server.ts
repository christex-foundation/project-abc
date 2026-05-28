import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return { token: url.searchParams.get('token') ?? '' };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = Object.fromEntries(await request.formData());
		const token = String(data.token ?? '').trim();
		const password = String(data.password ?? '');

		if (!token) return fail(400, { error: 'Missing reset token.' });
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters.' });
		if (!/\d/.test(password)) return fail(400, { error: 'Password must contain a digit.' });

		try {
			const resetResult = await auth.api.resetPassword({
				body: { newPassword: password, token }
			});
			if (resetResult?.status === false) {
				return fail(400, { error: 'Reset link is invalid or expired.' });
			}
		} catch (e) {
			console.error('[reset-password] resetPassword failed:', e);
			return fail(400, { error: 'Reset link is invalid or expired.' });
		}

		throw redirect(303, '/login?reset=1');
	}
};
