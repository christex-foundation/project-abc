import { fail, redirect } from '@sveltejs/kit';
import { registerCompanySchema, registerFreelancerSchema } from '$lib/validators/user';
import * as authService from '$lib/server/services/auth.service';
import { AppError } from '$lib/server/http';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const flag =
		(locals.settings?.COMPANY_SELF_REGISTER as { enabled?: boolean } | undefined) ?? null;
	return { companySelfRegisterEnabled: flag?.enabled === true };
};

export const actions: Actions = {
	freelancer: async ({ request }) => {
		const data = Object.fromEntries(await request.formData());
		const parsed = registerFreelancerSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input.' });
		}
		try {
			await authService.registerFreelancer(parsed.data);
		} catch (e) {
			if (e instanceof AppError) return fail(e.httpStatus, { error: e.message });
			throw e;
		}
		throw redirect(303, '/verify-email');
	},
	company: async ({ request }) => {
		const data = Object.fromEntries(await request.formData());
		const parsed = registerCompanySchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input.' });
		}
		try {
			await authService.registerCompany(parsed.data);
		} catch (e) {
			if (e instanceof AppError) return fail(e.httpStatus, { error: e.message });
			throw e;
		}
		throw redirect(303, '/verify-email');
	}
};
